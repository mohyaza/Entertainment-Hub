import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
process.env.JWT_SECRET = "test-only-secret-with-at-least-32-characters";
process.env.NODE_ENV = "test";
const { app } = await import("../src/app.js");
const { User, Content, Review } = await import("../src/models.js");
let mongo;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Review.init()]);
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
test("Alur akun, katalog, rating, favorit dan otorisasi", async () => {
  const c = await Content.create({ slug: "test", title: "Test", type: "film" });
  const credentials = {
    name: "Mahasiswa",
    email: "test@example.com",
    password: "Password123!",
  };
  let res = await request(app).post("/api/auth/register").send(credentials);
  assert.equal(res.status, 201);
  const token = res.body.token;
  const uid = res.body.user.id;
  assert.equal(res.body.user.password, undefined);
  const stored = await User.findById(uid).select("+password");
  assert.notEqual(stored.password, credentials.password);
  assert.equal(
    (await request(app).post("/api/auth/register").send(credentials)).status,
    409,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ ...credentials, password: "wrong" })
    ).status,
    401,
  );
  assert.equal(
    (await request(app).post("/api/auth/login").send(credentials)).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: { $ne: null }, password: { $ne: null } })
    ).status,
    400,
  );
  assert.equal((await request(app).get("/api/contents")).body.length, 1);
  assert.equal(
    (await request(app).put(`/api/contents/${c.id}/review`).send({ rating: 5 }))
      .status,
    401,
  );
  const auth = (r) => r.set("Authorization", "Bearer " + token);
  assert.equal(
    (
      await auth(request(app).put(`/api/contents/${c.id}/review`)).send({
        rating: 6,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await auth(request(app).put(`/api/contents/${c.id}/review`)).send({
        rating: 4,
        text: "Bagus",
      })
    ).status,
    200,
  );
  await auth(request(app).put(`/api/contents/${c.id}/review`)).send({
    rating: 5,
    text: "Diperbarui",
  });
  res = await request(app).get(`/api/contents/${c.id}`);
  assert.equal(res.body.average, 5);
  assert.equal(res.body.reviews.length, 1);
  assert.equal(res.body.reviews[0].user.name, "Mahasiswa");
  for (let i = 0; i < 2; i++)
    await auth(request(app).put("/api/favorites/" + c.id)).send({
      favorite: true,
    });
  res = await auth(request(app).get("/api/me"));
  assert.deepEqual(res.body.favorites, [c.id]);
  const other = await request(app)
    .post("/api/auth/register")
    .send({ ...credentials, email: "other@example.com" });
  assert.deepEqual(
    (
      await request(app)
        .get("/api/me")
        .set("Authorization", "Bearer " + other.body.token)
    ).body.favorites,
    [],
  );
  await auth(request(app).put("/api/favorites/" + c.id)).send({
    favorite: false,
  });
  assert.deepEqual(
    (await auth(request(app).get("/api/me"))).body.favorites,
    [],
  );
  assert.equal((await request(app).get("/api/contents/bad-id")).status, 400);
  assert.equal(
    (await request(app).get("/api/contents/" + new mongoose.Types.ObjectId()))
      .status,
    404,
  );
});
