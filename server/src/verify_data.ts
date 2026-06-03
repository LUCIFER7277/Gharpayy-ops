import { MongoClient } from 'mongodb';

async function main() {
  const url = "mongodb+srv://goravgharpayy_db_user:P7ccpHN4EojV3I4D@cluster0.bzvtk4h.mongodb.net/ops?appName=Cluster0";
  const client = new MongoClient(url);

  try {
    await client.connect();
    const db = client.db('ops');
    console.log("Connected to MongoDB");

    const owners = await db.collection('owners').find({}).toArray();
    console.log("\n--- OWNERS IN DATABASE ---");
    owners.forEach(o => {
      console.log(`ID: ${o._id || o.id}, Name: ${o.fullName || o.username || o.name}, Email: ${o.email}, Props: ${JSON.stringify(o.propertyIds)}`);
    });

    const properties = await db.collection('properties').find({}).toArray();
    console.log("\n--- PROPERTIES IN DATABASE ---");
    properties.forEach(p => {
      console.log(`ID: ${p._id || p.id}, CustomID: ${p.customId}, Name: ${p.name}, Area: ${p.area}, Owner: ${p.ownerId}`);
    });

    const rooms = await db.collection('rooms').find({}).toArray();
    console.log(`\nTotal Rooms: ${rooms.length}`);

    const roomStatuses = await db.collection('room_statuses').find({}).toArray();
    console.log(`Total Room Statuses: ${roomStatuses.length}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
