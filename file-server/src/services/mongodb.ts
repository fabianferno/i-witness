import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB using MONGO_URI from environment variables
 */
export const connectToMongoDB = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI not found in environment variables');
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db('iwitness');
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

/**
 * Get the MongoDB database instance
 */
export const getDatabase = async (): Promise<Db> => {
  if (!db) {
    return await connectToMongoDB();
  }
  return db;
};

/**
 * Get the posts collection
 */
export const getPostsCollection = async (): Promise<Collection> => {
  const database = await getDatabase();
  return database.collection('posts');
};

/**
 * Save a post hash to MongoDB
 */
export const savePostHash = async (hash: string, metadata?: Record<string, any>): Promise<void> => {
  try {
    const collection = await getPostsCollection();
    const post = {
      hash,
      createdAt: new Date(),
      ...metadata,
    };
    await collection.insertOne(post);
    console.log(`✅ Saved post hash to MongoDB: ${hash}`);
  } catch (error) {
    console.error('❌ Error saving post hash to MongoDB:', error);
    throw error;
  }
};

/**
 * Close MongoDB connection
 */
export const closeMongoDB = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ MongoDB connection closed');
  }
};

