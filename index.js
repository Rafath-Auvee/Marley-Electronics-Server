const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_KEY);
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
    const collection = client.db("test").collection("devices");
    const data = client.db("Marley").collection("products");
    const order = client.db("Marley").collection("orders");

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

    app.post("/order", async (req, res) => {
      const detail = req.body;
      const result = await order.insertOne(detail);

      return res.send({ success: true, result });
    });

    app.get("/order", async (req, res) => {

      const query = {};
      const cursor = order.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });


    app.get('/order/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const booking = await order.findOne(query);
      res.send(booking);
    })


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
