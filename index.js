require('dotenv').config()
const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    const paymentCollection = database.collection("payments");
    const articlesCollection = database.collection("articles");

    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '30d' })
      res.send({ token });
    })


    // ...........................//
    // midde ware //

    const verifyToken = (req, res, next) => {
      console.log("Headers received:", req.headers); // Check headers

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

    // verifyAdmin //

    const verifyAdmin = async (req, res, next) => {
      const userEmail = req.decoded.email
      console.log(req.decoded, "decoded");
      const query = { userEmail: userEmail }
      console.log(query, "query");
      const user = await usersCollection.findOne(query)
      console.log(user, "user");
      const isAdmin = user?.userRole === "Admin"
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" })
      }
      next()
    }



    // next()

    app.post('/users', async (req, res) => {
      const usersBody = req.body
      // new up
      const query = { userEmail: usersBody.userEmail }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      // new up
      const result = await usersCollection.insertOne(usersBody)
      res.send(result)
    })


    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // admin user validation//

    ////////// hooks user role/////////

    app.get('/users/role/:email', async (req, res) => {
      const userEmail = req.params.email
      const query = { userEmail }
      const result = await usersCollection.findOne(query)
      res.send({ userRole: result?.userRole })
    })



    // user role update//
    app.patch('/users/role/:email', verifyToken, verifyAdmin, async (req, res) => {
      const userEmail = req.params.email
      const { userRole } = req.body
      const filter = { userEmail }
      updateDoc = {
        $set: { userRole },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


    //  my profile user show//

    app.put('/myprofile/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { userEmail: email };
      const updateProfile = req.body;

      const updateDoc = {
        $set: {
          ...(updateProfile.userName && { userName: updateProfile.userName }),
          ...(updateProfile.userphoto && { userphoto: updateProfile.userphoto }),
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });




    //  my profile user name photo update//



    //  users delete/
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })


    // //////////////////////////

    // category//


    app.get('/category', async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        const categoryWithCount = await Promise.all(categories.map(async (category) => {
          const productCount = await medicineCollection.countDocuments({ medicineCategory: category.categoryName });
          return { ...category, productCount };
        }));

        res.send(categoryWithCount);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching data' });
      }
    });

    app.post('/category', verifyToken, verifyAdmin, async (req, res) => {
      const categoryBody = req.body
      const result = await categoryCollection.insertOne(categoryBody)
      res.send(result)
    })


    //  category update
    app.put('/category/:id', verifyToken, verifyAdmin, async (req, res) => {
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
    app.delete("/category/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await categoryCollection.deleteOne(query);
      res.send(result)
    })

    /////   token end admin///


    //  .............advertisement ////////////


    app.get('/advertisement', verifyToken, async (req, res) => {
      const result = await advertisementCollection.find().toArray()
      res.send(result)
    })

    app.get('/seller-advertisement/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { requestEmail: email }
      const result = await advertisementCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/acceptad-advertisement', async (req, res) => {
      try {
        const result = await advertisementCollection
          .find({ advertisementStatus: "Accept" })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching advertisements:", error);
        res.status(500).send({ error: "Failed to fetch advertisements" });
      }
    });


    app.post('/advertisement', verifyToken, async (req, res) => {
      const advertisementsBody = req.body
      const result = await advertisementCollection.insertOne(advertisementsBody)
      res.send(result)
    })


    app.patch('/advertisement/status/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const { advertisementStatus } = req.body
      const filter = { _id: new ObjectId(id) }
      updateDoc = {
        $set: { advertisementStatus },
      };
      const result = await advertisementCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.delete("/advertisement/:id", verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await advertisementCollection.deleteOne(query);
      res.send(result)
    })


    // medicine collcektion //

    app.get('/medicine', async (req, res) => {
      // search filter setup/
      const search = req.query.search
      const sort = req.query.sort
      const query = {
        $or: [
          { medicineName: { $regex: search, $options: 'i' } },
          { medicineCategory: { $regex: search, $options: 'i' } },
          {
            genericName: { $regex: search, $options: 'i' }
          },
          {
            company: { $regex: search, $options: 'i' }
          },

        ]
      };

      let options = {}
      if (sort) options = { sort: { perUnitPrice: sort === "asc" ? 1 : -1 } }
      const result = await medicineCollection.find(query, options).toArray()
      res.send(result)
    })


    app.get('/latest-product', async (req, res) => {
      try {
        const result = await medicineCollection
          .find()
          .sort({ _id: -1 }) // Newest products first (descending order)
          .limit(8) // Limit to the latest 6 products
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching latest products:", error);
        res.status(500).send({ error: "Failed to fetch latest products" });
      }
    });

    //////////////////// Az


    app.get('/medicine/manage/:email', async (req, res) => {
      const email = req.params.email
      const query = { sellerEmail: email }
      const result = await medicineCollection.find(query).toArray()
      res.send(result)
    })



    // ////////


    app.get('/medicine-percent', async (req, res) => {
      const query = { discountPercentage: { $gt: 0 } };
      const result = await medicineCollection.find(query).toArray();
      res.send(result)
    });

    // /

    app.get('/categoryMedicine', async (req, res) => {
      const categoryName = req.query.category;
      const medicines = await medicineCollection.find({ medicineCategory: categoryName }).toArray();
      res.send(medicines);
    });


    // /////





    app.post('/medicine', verifyToken, async (req, res) => {
      const medicineBody = req.body
      const result = await medicineCollection.insertOne(medicineBody)
      res.send(result)
    })

    app.put('/medicine/:id', verifyToken, async (req, res) => {
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


    app.delete("/medicine/:id", verifyToken, async (req, res) => {
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
      const query = { email: email }
      const result = await cartsCollection.find(query).toArray()
      res.send(result)
    })

    app.get("/carts/total", async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const payments = await cartsCollection.find(query).toArray();
      const totalPrice = payments.reduce((sum, payment) => sum + payment.subTotal, 0);
      res.send({ totalPrice });
    });




    app.put('/carts/:id', verifyToken, async (req, res) => {
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


    app.delete("/carts/:id", verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result)
    })

    app.delete("/cartsClear", verifyToken, async (req, res) => {
      const id = req.params.id
      const query = {};
      const result = await cartsCollection.deleteMany(query);
      res.send(result)
    })

    // Admin home page//


    app.get("/payment/pending-paid", verifyToken, async (req, res) => {
      const pendingQuery = { status: "Pending" }
      const paidQuery = { status: "Paid" }
      const pendingCount = await paymentCollection.countDocuments(pendingQuery)
      const paidCount = await paymentCollection.countDocuments(paidQuery)
      res.send({ pendingCount, paidCount });
    });


    app.get("/payment/price-calclute", async (req, res) => {
      const pendingQuery = { status: "Pending" }
      const paidQuery = { status: "Paid" }
      const totalPrice = await paymentCollection.find(pendingQuery).toArray()
      const pendingPrice = totalPrice.reduce((sum, payment) => sum + payment.price, 0);
      const totalPaid = await paymentCollection.find(paidQuery).toArray()
      const paidPrice = totalPaid.reduce((sum, payment) => sum + payment.price, 0);
      res.send({ pendingPrice, paidPrice });
    });


    app.get("/order/total", async (req, res) => {
      const totalOrder = await paymentCollection.countDocuments()
      res.send({ totalOrder });
    });


    app.get('/all-payments', verifyToken, async (req, res) => {
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })

    app.put('/payment-status/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const { status } = req.body
      const updateDoc = {
        $set: {
          status
        }
      }
      const result = await paymentCollection.updateOne(filter, updateDoc);
      res.send(result)
    })



    // Seller home page//


    app.get("/payment/pending-paid/:email", verifyToken, async (req, res) => {
      const email = req.params.email
      const pendingQuery = { status: "Pending", sellerEmail: email }
      const paidQuery = { status: "Paid", sellerEmail: email }
      const pendingCount = await paymentCollection.countDocuments(pendingQuery)
      const paidCount = await paymentCollection.countDocuments(paidQuery)
      res.send({ pendingCount, paidCount });
    });

    app.get("/payment/price-calclute/:email", async (req, res) => {
      const email = req.params.email
      const pendingQuery = { status: "Pending", sellerEmail: email }
      const paidQuery = { status: "Paid", sellerEmail: email }
      const totalPrice = await paymentCollection.find(pendingQuery).toArray()
      const pendingPrice = totalPrice.reduce((sum, payment) => sum + payment.price, 0);
      const totalPaid = await paymentCollection.find(paidQuery).toArray()
      const paidPrice = totalPaid.reduce((sum, payment) => sum + payment.price, 0);
      res.send({ pendingPrice, paidPrice });
    });

    app.get("/order/total/:email", verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { sellerEmail: email }
      const totalOrder = await paymentCollection.countDocuments(query)
      res.send({ totalOrder });
    });

    app.get('/all-payments/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { sellerEmail: email }
      const result = await paymentCollection.find(query).toArray()
      res.send(result)
    })

    // User Payment history//

    app.get('/user/all-payments/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await paymentCollection.find(query).toArray()
      res.send(result)
    })

    //  invoice//

    app.get('/invoice/payment/:transactionId', verifyToken, async (req, res) => {
      const { transactionId } = req.params;
      const payment = await paymentCollection.findOne({ transactionId })
      res.send(payment)
    });



    // articles start//

    app.get('/articles', async (req, res) => {
      const result = await articlesCollection.find().toArray();
      res.send(result)
    });

    // articles end//


    // /////////////////////////////////////////////////////

    // payment intent
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const { subTotal } = req.body;
      const amount = parseInt(subTotal * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    app.post('/payments', async (req, res) => {
      const payment = req.body;
      console.log('Received payment:', payment); // Debugging
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartsCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
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
