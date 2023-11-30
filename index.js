const express = require('express')
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5001

// middleWere
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ovs4csm.mongodb.net/?retryWrites=true&w=majority`;

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

    const allPostCollection = client.db("forumDb").collection("allPost");
    const userCollection = client.db("forumDb").collection("users");
    const announceCollection = client.db("forumDb").collection("announce");
    const commentCollection = client.db("forumDb").collection("comment");
    const paymentCollection = client.db("forumDb").collection("payments");
    //jwt related api
    app.post('/jwt', async (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'})
      res.send({token});

    })

    //middlewares
    const verifyToken = (req, res, next) =>{
      console.log('inside verify token',req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorized assess'})
        }
        req.decoded = decoded;
        next();
      })
    }

    // user verify admin after verify token
    const verifyAdmin = async(req, res, next) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
    }

    // users related api

    app.get('/users', verifyToken, verifyAdmin, async(req, res)=>{
      console.log(req.headers);
      const result = await userCollection.find().toArray()
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async(req, res) =>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email}
      const user = await userCollection.findOne(query)
      let admin = false;
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({admin});
    })

    app.post('/users', async (req, res) =>{
      const user = req.body
      // insert email if user dosen't exist:
      // you can do this many ways (1. email unique, 2.upsert, 3.simple checking)
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user alrady exists', insertedId: null})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id',verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.delete('/users/:id',verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await userCollection.deleteOne(query)
      res.send(result);
    })


    // post releted api
    app.get('/allPost', async(req, res)=>{
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);

        // console.log("pagination query",page, size)
        const result = await allPostCollection.find()
        .skip(page * size)
        .limit(size)
        .toArray()
        res.send(result)
    })

    app.get('/allPost/:id', async (req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await allPostCollection.findOne(query);
        res.send(result);
      })

      app.get('/myallPost/:email',async(req, res)=>{
      
        const userEmail = req.params.email
        
        const result = await allPostCollection.find({email:userEmail}).toArray()
        res.send(result);
      })

      app.delete('/allPost/:id', async(req, res)=>{
        const id = req.params.id;
        const query = { _id: new ObjectId (id) };
        const result = await allPostCollection.deleteOne(query);
        res.send(result);
      })

      app.post('/allPost',verifyToken, async (req, res) =>{
        const item = req.body;
        const result = await allPostCollection.insertOne(item);
        res.send(result)
      })

      app.post('/announce',verifyToken,verifyAdmin, async (req, res) =>{
        const item = req.body;
        const result = await announceCollection.insertOne(item);
        res.send(result)
      })

      app.get('/announce', async(req, res)=>{
        const result = await announceCollection.find().toArray();
        res.send(result);
      })

      //like related para vi

      app.put("/UpVote/:id", async (req, res) => {
        const id = req.params.id;
        const updatedPost = await allPostCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { up_votes_count: 1 } }
          // { returnDocument: "after" }
        );
  
        res.send(updatedPost.value);
      });
  
      app.put("/downVote/:id", async (req, res) => {
        const id = req.params.id;
        const updatedPost = await allPostCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { down_votes_count: 1 } }
          // { returnDocument: "after" }
        );
        res.send(updatedPost.value);
      });

      // comment related api vi

      app.get("/comment", async (req, res) => {
        const query = req.body;
        const result = await commentCollection.find(query).toArray();
        res.send(result);
      });
  
      app.post("/comment", async (req, res) => {
        const query = req.body;
        const result = await commentCollection.insertOne(query);
        res.send(result);
      });
  
  
      app.get("/allPost-comments/:postId", async (req, res) => {
        const postId = req.params.postId;
  
        console.log("Requested Post ID:", postId);
        if (!postId) return;
        try {
          const comments = await commentCollection.find({ postId }).toArray();
  
          res.send(comments);
        } catch (error) {
          console.error("Error retrieving comments:", error);
          res.status(500).send({ error: "Internal Server Error" });
        }
      });


       // payment intent
    app.post('/create-payment-intent', async( req, res) =>{
      const { price} = req.body;
      const amount = parseInt( price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ 
        clientSecret: paymentIntent.client_secret
      })
    })

    app.get('/payments/:email', verifyToken, async (req,res)=>{
      const query = {email: req.params.email}
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res)=>{
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment)
      console.log('payment info', payment)
      res.send(paymentResult)
    })


      // admin stats 

      app.get('/allPostCount', async (req, res) =>{
        const count = await allPostCollection.estimatedDocumentCount()
        res.send({count})
      })

      app.get('/admin-stats', async(req, res) =>{
        const users = await userCollection.estimatedDocumentCount();
        const totalPosts = await allPostCollection.estimatedDocumentCount();
        const totalComment = await commentCollection.estimatedDocumentCount();
          
        // this is not the best way
        res.send({
          users,
          totalPosts,
          totalComment
        })
      })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('im running')
})

app.listen(port, ()=>{
    console.log(`assignment forum running on port ${port}`)
})