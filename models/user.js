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
	emailVerified: { type: Boolean, default: false },
	oldEmail: { type: String },
	projects: [
		{ type: Schema.Types.ObjectId, ref: 'Project' }
	],
	deletedProjects: [
		{ type: Schema.Types.ObjectId, ref: 'Project' }
	],
	stylesets: [
		{ type: Schema.Types.ObjectId, ref: 'Styleset' }
	],
	defaultStyleset: { type: Schema.Types.ObjectId, ref: 'Styleset' },
	// Currently not used: not possible to delete a styleset
	deletedStylesets: [
		{ type: Schema.Types.ObjectId, ref: 'Styleset' }
	],
	password: { type: String },
	providers: [
		{}
	],
	modified: { type: Date, default: Date.now },
	showArchived: { type: Boolean, default: false },
	showArchivedDocuments: { type: Boolean, default: false },
	newsletter: { type: Boolean, default: true },
	level: { type: String, default: "free" },
	storageUsed: { type: Number, default: 0},
	passwordResetToken: {type: String},
	isDemo: { type: Boolean, default: false },
	payment: {
		customerId: { type: String },
		subscriptionId: { type: String},
		billingCountryCode: { type: String},
		endDate: { type: Date },
		payments: [{
			id: { type: String },
			amount: { type: String },
			date: { type: Date, default: Date.now },
			type: { type: String, enum: ['recurring', 'single'] },
			countryCode: { type: String},
			vatRate: { type: Number, default: 0},
			description: { type: String}
		}],
		cancelled: { type: Boolean, default: false }
	}
});

/** Handle bcrypt password-hashing.
 * Source: http://devsmash.com/blog/password-authentication-with-mongoose-and-bcrypt
 */
UserSchema.pre('save', function (next) {
	var user = this;

	user.modified = Date.now();

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
