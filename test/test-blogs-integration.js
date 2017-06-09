const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
	console.info('seeding blog post data');
	const seedData = [];

	for (let i=1; i<=10; i++) {
		seedData.push(generateBlogPostData());
	}
	// this will return a promise
	return BlogPost.insertMany(seedData);
}

// generate an object representing a blog post
// can be used to generate seed data for db
// or request.body data
function generateBlogPostData() {
	return {
		title: faker.lorem.sentence(),
		content: faker.lorem.paragraph(),
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		}
	}
}

// this function deletes the entire db
// we'll call it in an `afterEach` block below
// to ensure data from one test does not stick
// around for next one
function tearDownDb() {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('BlogPosts API resource', function() {

	// we need each of these hook functions to return a promise
	// otherwiese we'd need to call a `done` callback. `runServer`,
	// `seedBlogPostData` and `tearDownDb` each return a promise,
	// so we return the value returned by these function calls.
	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedBlogPostData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	})

	describe('GET endpoint', function() {
		it('should return all existing blog posts', function() {
			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res) {
					res = _res;
					res.should.have.status(200);
					res.body.should.have.length.of.at.least(1);
					return BlogPost.count();
				})
				// .then(count => {
				// 	res.body.should.have.length.of(count);
				// });
		});

		it('should return posts with right fields', function() {
			let resPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					res.should.have.status(200);
					res.should.be.json;
					res.body.should.be.a('array');
					res.body.should.have.length.of.at.least(1);

					res.body.forEach(function(post) {
						post.should.be.a('object');
						post.should.include.keys(
							'id', 'title', 'author', 'content', 'created');
					});
					resPost = res.body[0];
					return BlogPost.findById(resPost.id);
				})
				.then(function(post) {
					resPost.id.should.equal(post.id);
					resPost.title.should.equal(post.title);
					resPost.author.should.equal(post.authorName);
					resPost.content.should.equal(post.content);
				});
		});
	});

	describe('POST endpoint', function() {
		it('should add a new post', function() {
			const newPost = generateBlogPostData();

			return chai.request(app)
				.post('/posts')
				.send(newPost)
				.then(function(res) {
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys(
						'id', 'title', 'author', 'content', 'created');
					res.body.title.should.equal(newPost.title);
					res.body.id.should.not.be.null;
					res.body.author.should.equal(
						`${newPost.author.firstName} ${newPost.author.lastName}`);
					res.body.content.should.equal(newPost.content);
					return BlogPost.findById(res.body.id);
				})
				.then(function(post) {
					post.title.should.equal(newPost.title);
					post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);
					post.content.should.equal(newPost.content);
				});
		});
	});

	describe('PUT endpoint', function() {
		it('should update fields you send over', function() {
			const updateData = {
				title: 'What I learned yesterday',
				content: 'adsfa rteh fgdhg vsfg hhyjt ijohh',
				author: {
					firstName: 'John',
					lastName: 'Doe'
				}
			};

			return BlogPost
				.findOne()
				.exec()
				.then(function(post) {
					updateData.id =  post.id;
					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updateData);
				})
				.then(function(res) {
					res.should.have.status(201);
					res.should.be.json;
          res.body.should.be.a('object');
          res.body.title.should.equal(updateData.title);
          res.body.author.should.equal(
            `${updateData.author.firstName} ${updateData.author.lastName}`);
          res.body.content.should.equal(updateData.content);
					return BlogPost.findById(res.body.id).exec();
				})
				.then(function(post) {
					post.title.should.equal(updateData.title);
					post.content.should.equal(updateData.content);
					post.author.firstName.should.equal(updateData.author.firstName);
          post.author.lastName.should.equal(updateData.author.lastName);
				});
		});
	});


});































