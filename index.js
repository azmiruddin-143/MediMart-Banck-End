require('dotenv').config()
const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
app.use(express.json())
app.use(cors())


// mongodb setup///
const uri = `mongodb+srv://${process.env.MEDIMART_USER}:${process.env.MEDIMART_PASS}@cluster0.phy8j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster01`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const database = client.db("MediMart");
    const usersCollection = database.collection("users");
    const categoryCollection = database.collection("category");
    
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '5h' })
      res.send({ token });
    })


    // ...........................//
     // midde ware //

     const verifyToken = (req, res, next) => {
      console.log(req.headers);

      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" })
      }

      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" })
        }
        req.decoded = decoded
        next()
      });

    }
      // next()

    app.post('/users', async (req, res) => {
      const usersBody = req.body
      const result = await usersCollection.insertOne(usersBody)
      res.send(result)
    })
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // user role update///

    app.patch('/users/role/:email', async (req, res) => {
      const userEmail = req.params.email
      const { userRole } = req.body
      const filter = { userEmail }
      updateDoc = {
        $set: {userRole},
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // category//

    app.get('/category', async (req, res) => {
      const result = await categoryCollection.find().toArray()
      res.send(result)
    })

    app.post('/category', async (req, res) => {
      const usersBody = req.body
      const result = await categoryCollection.insertOne(usersBody)
      res.send(result)
    })





    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("MediMart Website make ...")
})

app.listen(port, () => {
  console.log("Server Runnig", port);
})
