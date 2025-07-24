import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionString = `${process.env.MONGO_URI}`;

    await mongoose.connect(connectionString);

    console.log(`✅ Database connected successfully`);
  } catch (error) {
    console.log(`❌ Database connection failed`);
    console.log(error);
    process.exit(1);
  }
};

export default connectDB;
