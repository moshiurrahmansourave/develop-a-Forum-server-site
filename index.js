const express = require('express')
const app = express();
const cors = require('cors');
require('dotenv').config()
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

    app.get('/allPost', async(req, res)=>{
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);

        console.log("pagination query",page, size)
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

      app.get('/allPostCount', async (req, res) =>{
        const count = await allPostCollection.estimatedDocumentCount()
        res.send({count})
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