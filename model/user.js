require("dotenv").config()
const mongoose = require("mongoose")
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const uniqueValidator = require('mongoose-unique-validator')

const UserSchema = new mongoose.Schema({
  username: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"] },
  email: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"] },
  bio: String,
  image: String,
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hash: String,
  salt: String
}, { timestamps: true })

UserSchema.plugin(uniqueValidator, { message: 'is already taken.' })

UserSchema.methods.generateJWT = function () {
  const today = new Date()
  let exp = new Date(today)
  exp.setDate(today.getDate() + 60)

  return jwt.sign({
    id: this._id,
    username: this.username,
    exp: parseInt(exp.getTime() / 1000),
  }, process.env.JWT_KEY)
}

// Generate Token
UserSchema.methods.toAuthJSON = function () {
  return {

    username: this.username,
    email: this.email,
    token: this.generateJWT(),
    bio: this.bio,
    image: this.image
  }
}

// Validate Password
UserSchema.methods.validPassword = function (password) {
  const hashs = crypto.pbkdf2Sync(password, this.salt, 10000, 64, 'sha512').toString('hex')
  return (this.hash === hashs)
}

// Hash password
UserSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex')
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 64, 'sha512').toString('hex')
}

// Get Profile form
UserSchema.methods.toProfileJSONFor = function (user) {
  return {
    username: this.username,
    bio: this.bio,
    image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
    following: user ? user.isFollowing(this._id) : false
  }
}

// Follow
UserSchema.methods.follow = function (id) {
  if (this.following.indexOf(id) === -1) {
    this.following.push(id)
  }
  return this.save()
}

// Unfollow
UserSchema.methods.unfollow = function (id) {
  if (this.following.indexOf(id) !== -1) {
    this.following.remove(id)
  }
  return this.save()
}

// Check is Following
UserSchema.methods.isFollowing = function (id) {
  return this.following.some((followId) => {
    return followId.toString() === id.toString()
  })
}


// Check Favorite
UserSchema.methods.isFavorite = function (id) {
  return this.favorites.some((favoriteId) => {
    return favoriteId.toString() === id.toString()
  })
}

// Favorite
UserSchema.methods.favorite = function(id){
  if(this.favorites.indexOf(id) === -1){
    this.favorites.push(id)
  }
  return this.save()
}

// Unfavorite
UserSchema.methods.unfavorite = function(id){
  this.favorites.remove(id)
  return this.save()
}

module.exports = mongoose.model("User", UserSchema);