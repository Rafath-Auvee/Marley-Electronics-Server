const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const stripe = require('stripe')(process.env.STRIPE_KEY);
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.user}:${process.env.password}@cluster0.pvin3.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access." });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const data = client.db("Marley").collection("products");
    const order = client.db("Marley").collection("orders");
    const userData = client.db("Marley").collection("user");
    const paymentData = client.db("Marley").collection("payments");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userData.findOne({ email: requester });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    //payment

    app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
      const service = req.body;
      const price = service.price;
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency: 'usd',
        payment_method_types:['card']
      });
      res.send({clientSecret: paymentIntent.client_secret})
    });
    //booking status
    app.patch('/booking/:id', verifyJWT, async(req, res) =>{
      const id  = req.params.id;
      const payment = req.body;
      const filter = {_id: ObjectId(id)};
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }
      const result = await paymentData.insertOne(payment);
      const updatedBooking = await appointment.updateOne(filter, updatedDoc);
      res.send(updatedBooking);
    })

    //products
    app.get("/resources", async (req, res) => {
      const query = {};
      const cursor = data.find(query);
      products = await cursor.toArray();
      res.send(products);
    });

    app.get(`/resources/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await data.findOne(query);
      res.send(product);
    });
    app.put(`/resources/:id`, async (req, res) => {
      const id = req.params.id;
      const product = req.body.parseTotalQ;
      console.log(product.parseTotalQ)
      const filter = {_id: ObjectId(id)};
      const updatedDoc = {
        $set: {
          quantity: product
        }
      }
      const result = await data.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //booking
    app.post("/booking", async (req, res) => {
      const detail = req.body;
      const result = await order.insertOne(detail);

      return res.send({ success: true, result });
    });

    app.get("/booking", async (req, res) => {
      const query = {};
      const cursor = order.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });


    app.get('/booking/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const booking = await order.findOne(query);
      res.send(booking);
    })

    //user
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userData.find().toArray();
      res.send(users);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userData.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userData.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userData.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.SECRET, {
        expiresIn: "12h",
      });
      res.send({ result, token });
    });


  } finally {
    // console.log("Server Connected")
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is working ${port}`);
});
