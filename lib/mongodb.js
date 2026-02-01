import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'mk8dx_hub';
const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch(error => {
      console.warn('MongoDB connection failed:', error.message);
      console.warn('Running in offline mode with mock data.');
      return null;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch(error => {
    console.error('MongoDB connection failed:', error.message);
    return null;
  });
}

export async function getDatabase() {
  try {
    const client = await clientPromise;
    if (!client) {
      throw new Error('MongoDB connection not available');
    }
    return client.db(dbName);
  } catch (error) {
    console.warn('Failed to connect to MongoDB:', error.message);
    // Return a mock database interface
    return getMockDatabase();
  }
}

// Mock database implementation
function getMockDatabase() {
  const mockCollections = new Map();

  return {
    collection: (name) => {
      if (!mockCollections.has(name)) {
        mockCollections.set(name, new MockCollection(name));
      }
      return mockCollections.get(name);
    }
  };
}

class MockCollection {
  constructor(name) {
    this.name = name;
    this.documents = [];

    // Initialize with some mock data based on collection name
    if (name === 'users') {
      this.documents = [
        { id: 1, name: 'Demo User', verified: true, mmr: 15000, createdAt: new Date() }
      ];
    } else if (name === 'matches') {
      this.documents = [
        { id: 1, player1: 'Player1', player2: 'Player2', winner: 'Player1', date: new Date() }
      ];
    }
  }

  async findOne(query) {
    if (this.name === 'users' && query.verified) {
      return this.documents.find(doc => doc.verified);
    }
    return this.documents[0] || null;
  }

  async countDocuments(query = {}) {
    if (Object.keys(query).length === 0) {
      return this.documents.length;
    }
    // Simple filtering based on query
    return this.documents.filter(doc => {
      for (const [key, value] of Object.entries(query)) {
        if (doc[key] !== value) return false;
      }
      return true;
    }).length;
  }

  async find(query = {}, options = {}) {
    let results = [...this.documents];

    // Apply query filtering
    if (Object.keys(query).length > 0) {
      results = results.filter(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      });
    }

    // Apply sorting if specified
    if (options.sort) {
      const [[sortField, sortOrder]] = Object.entries(options.sort);
      results.sort((a, b) => {
        if (a[sortField] < b[sortField]) return sortOrder === -1 ? 1 : -1;
        if (a[sortField] > b[sortField]) return sortOrder === -1 ? -1 : 1;
        return 0;
      });
    }

    // Apply limit if specified
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return {
      toArray: async () => results
    };
  }

  async insertOne(document) {
    const newDoc = { ...document, _id: Date.now() }; // Simple ID generation
    this.documents.push(newDoc);
    return { insertedId: newDoc._id };
  }

  async updateOne(filter, update) {
    const fieldToUpdate = update.$set || update;
    for (let i = 0; i < this.documents.length; i++) {
      let match = true;
      for (const [key, value] of Object.entries(filter)) {
        if (this.documents[i][key] !== value) {
          match = false;
          break;
        }
      }
      if (match) {
        this.documents[i] = { ...this.documents[i], ...fieldToUpdate };
        return { matchedCount: 1, modifiedCount: 1 };
      }
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }
}

export default clientPromise;