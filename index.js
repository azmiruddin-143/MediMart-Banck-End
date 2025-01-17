require('dotenv').config()
const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const advertisementCollection = database.collection("advertisement");
    const medicineCollection = database.collection("medicine");
    const cartsCollection = database.collection("carts");

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
        $set: { userRole },
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
      const categoryBody = req.body
      const result = await categoryCollection.insertOne(categoryBody)
      res.send(result)
    })


    //  category update
    app.put('/category/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateCategory = req.body
      const updateDoc = {
        $set: {
          categoryName: updateCategory.categoryName,
          categoryImage: updateCategory.categoryImage,
        }
      }
      const result = await categoryCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


    //  category delete/
    app.delete("/category/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await categoryCollection.deleteOne(query);
      res.send(result)
    })


    //  .............advertisement ////////////


    app.get('/advertisement', async (req, res) => {
      const result = await advertisementCollection.find().toArray()
      res.send(result)
    })

    app.get('/acceptad-advertisement', async (req, res) => {
      try {
        const result = await advertisementCollection
          .find({ advertisementStatus: "Accepted" })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching advertisements:", error);
        res.status(500).send({ error: "Failed to fetch advertisements" });
      }
    });


    app.post('/advertisement', async (req, res) => {
      const advertisementsBody = req.body
      const result = await advertisementCollection.insertOne(advertisementsBody)
      res.send(result)
    })


    app.patch('/advertisement/status/:id', async (req, res) => {
      const id = req.params.id
      const { advertisementStatus } = req.body
      const filter = { _id: new ObjectId(id) }
      updateDoc = {
        $set: { advertisementStatus },
      };
      const result = await advertisementCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


    // medicine collcektion //

    app.get('/medicine', async (req, res) => {
      const result = await medicineCollection.find().toArray()
      res.send(result)
    })
    app.get('/medicine-percent', async (req, res) => {
      const query = { discountPercentage: { $gt: 0 } };
      const result = await medicineCollection.find(query).toArray();
      res.send(result)
    });

    app.post('/medicine', async (req, res) => {
      const medicineBody = req.body
      const result = await medicineCollection.insertOne(medicineBody)
      res.send(result)
    })

    app.put('/medicine/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateMedicine = req.body
      const updateDoc = {
        $set: {
          medicineName: updateMedicine.medicineName,
          genericName: updateMedicine.genericName,
          shortDescription: updateMedicine.shortDescription,
          medicineImage: updateMedicine.medicineImage,
          company: updateMedicine.company,
          medicineMassUnit: updateMedicine.medicineMassUnit,
          perUnitPrice: updateMedicine.perUnitPrice,
          discountPercentage: updateMedicine.discountPercentage,
        }
      }
      const result = await medicineCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


    app.delete("/medicine/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await medicineCollection.deleteOne(query);
      res.send(result)
    })



    // carts collections///

    app.post('/carts', async (req, res) => {
      const cartsBody = req.body
      const result = await cartsCollection.insertOne(cartsBody)
      res.send(result)
    })

    
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      const query = {email: email}
      const result = await cartsCollection.find(query).toArray()
      res.send(result)
    })


    app.put('/carts/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateCart = req.body
      const updateDoc = {
        $set: {
          quantity: updateCart.quantity,
          subTotal: updateCart.subTotal,
        }
      }
      const result = await cartsCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result)
    })

    app.delete("/cartsClear", async (req, res) => {
      const id = req.params.id
      const query = {};
      const result = await cartsCollection.deleteMany(query);
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
