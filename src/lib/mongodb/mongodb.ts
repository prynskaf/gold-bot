import { MongoClient, Db } from 'mongodb';

const uri: string = process.env.MONGODB_URI as string;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

// Extend the global object to include _mongoClientPromise
interface CustomNodeJsGlobal extends NodeJS.Global {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const global: CustomNodeJsGlobal;

if (process.env.NODE_ENV === 'development') {
  // Use a global variable to preserve the MongoClient instance across hot reloads in development.
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, we create a new MongoClient instance.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB as string);
}

export default clientPromise;
