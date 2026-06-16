import { DatabaseAdapter } from './DatabaseAdapter.js';

export class MongooseAdapter extends DatabaseAdapter {
  constructor(UserModel) {
    super();
    this.UserModel = UserModel;
  }

  // Helper to ensure we return plain JS objects, not Mongoose documents
  _toPlain(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    return obj;
  }

  async getUserByEmail(email) {
    const user = await this.UserModel.findOne({ email });
    return this._toPlain(user);
  }

  async getUserByEmailWithPassword(email) {
    const user = await this.UserModel.findOne({ email }).select("+password");
    return this._toPlain(user);
  }

  async getUserById(id) {
    const user = await this.UserModel.findById(id);
    return this._toPlain(user);
  }

  async createUser(userData) {
    const newUser = new this.UserModel(userData);
    await newUser.save();
    return this._toPlain(newUser);
  }

  async updateUser(id, updateData) {
    const updatedUser = await this.UserModel.findByIdAndUpdate(id, updateData, { new: true });
    return this._toPlain(updatedUser);
  }
}
