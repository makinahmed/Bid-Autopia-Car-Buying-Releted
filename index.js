const express = require('express')
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID
require("dotenv").config();
const app = express()
const cors = require('cors')
app.use(cors())
app.use(express.json())
const port = process.env.PORT || 5000
const serviceAccount = require('./bid-autopia-secreat-key.json');
const admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m8c0v.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    const token = req?.headers?.authorization;
    try {
        if (token.startsWith('Bearer ')) {
            const idToken = token.split('Bearer ')[1]
            const decodeToken = admin.auth().verifyIdToken(idToken)
            req.userDecodeToken = decodeToken;
        }
    } catch {

    }

    next()
}
// console.log(uri);

async function run() {
    try {
        await client.connect();
        const database = client.db("bid_autopia");
        const productsCollection = database.collection("products");
        const soldedOutCarsCollection = database.collection("soldedOutCars");
        const reviewsCollection = database.collection("reviews");
        const registeredUsersCollection = database.collection("registeredUsers");


        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(result)
        })

        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const result = await cursor.toArray();
            res.json(result)
        })

        app.get(`/carPurchase/:id`, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const car = await productsCollection.findOne(query);
            res.json(car);
        })


        app.get('/manageAllOrders', async (req, res) => {
            const result = await soldedOutCarsCollection.find({}).toArray()
            res.json(result)
        })
        app.get('/myOrders/:email', async (req, res) => {
            console.log(req.headers);
            const email = req.params.email;
            const query = { email: email }
            const result = await soldedOutCarsCollection.find(query).toArray()
            res.json(result)
        })

        app.post('/soldedOut', async (req, res) => {

            const soldedCar = req.body;
            const result = await soldedOutCarsCollection.insertOne(soldedCar);
            res.json(result)
        })
        app.post('/reviews', async (req, res) => {

            const reviews = req.body;
            const result = await reviewsCollection.insertOne(reviews);
            res.json(result)
        })
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const result = await cursor.toArray();
            res.json(result)
        })

        app.put('/makeAdmin', async (req, res) => {
            const email = req.body.email;
            console.log(email);
            const filter = { email: email };
            const options = { upsert: true };
            const updateUser = {
                $set: {
                    role: 'admin'

                }
            }
            const result = await registeredUsersCollection.updateOne(filter, updateUser, options)
            res.json(result)
        })

        app.get('/users/isAdmin', async (req, res) => {
            const email = req.query.email;
            const query = { role: "admin", email: email };
            const result = await registeredUsersCollection.findOne(query);
            let isAdmin = false;
            if (result === null) {
                isAdmin = false
            } else {
                isAdmin = true
            }
            console.log(isAdmin);
            res.json({ admin: isAdmin })
        })
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await registeredUsersCollection.findOne(query)
            res.json(result)
        })

        app.put('/approve', async (req, res) => {
            const id = req.body.id;
            const email = req.body.email;
            // console.log((id, email));
            const filter = { email: email, _id: ObjectId(id) }
            const updateStatus = {
                $set: {
                    status: 'shipped'
                }
            };
            const result = await soldedOutCarsCollection.updateOne(filter, updateStatus);
            res.json(result)

        })

        app.put('/createNewUser', async (req, res) => {
            const user = req.body;
            const options = { upsert: true };
            const filter = { email: user.email }
            const createUser = {
                $set: user
            };
            const result = await registeredUsersCollection.updateOne(filter, createUser, options);
            res.json(result)

        })

        app.delete("/cancelOrder", async (req, res) => {
            const email = req.query.email;
            const id = req.query.id;

            const query = { email: email, _id: ObjectId(id) };
            const result = await soldedOutCarsCollection.deleteOne(query);
            res.json(result)

        })
        app.delete("/deleteProduct", async (req, res) => {

            const id = req.query.id;

            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result)

        })



    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    console.log(' this is the server');
    res.json('HII')
})

app.listen(port, () => {
    console.log('server is running on : ', port);
})