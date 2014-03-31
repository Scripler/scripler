var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, bcrypt = require('bcrypt')
	, SALT_WORK_FACTOR = 10;

/**
 * User DB
 */
var UserSchema = new Schema({
	firstname: { type: String, required: true},
	lastname: { type: String},
	email: { type: String, required: true, unique: true },
	emailValidated: { type: Boolean, default: false },
	projects: [
		{ type: Schema.Types.ObjectId, ref: 'Project' }
	],
	password: { type: String, required: true },
	providers: [
		{}
	],
	modified: { type: Date, default: Date.now },
	showArchived: { type: Boolean, default: false },
	showArchivedDocuments: { type: Boolean, default: false },
	newsletter: { type: Boolean, default: true }
});

/** Handle bcrypt password-hashing.
 * Source: http://devsmash.com/blog/password-authentication-with-mongoose-and-bcrypt
 */
UserSchema.pre('save', function (next) {
	var user = this;

	// only hash the password if it has been modified (or is new)
	if (!user.isModified('password')) return next();

	// generate a salt
	bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
		if (err) return next(err);

		// don't hash empty password
		if (!user.password) return next(err);

		// hash the password along with our new salt
		bcrypt.hash(user.password, salt, function (err, hash) {
			if (err) return next(err);

			// override the cleartext password with the hashed one
			user.password = hash;
			next();
		});
	});
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
		if (err) return cb(err);
		cb(null, isMatch);
	});
};

exports.User = mongoose.model('User', UserSchema);
