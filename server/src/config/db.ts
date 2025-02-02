import mongoose from 'mongoose';

const MONGO_URI="mongodb+srv://albalakyoav:cvtvPpLKXa42mpU@cluster.werpa.mongodb.net/"

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      // Removed deprecated options
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;