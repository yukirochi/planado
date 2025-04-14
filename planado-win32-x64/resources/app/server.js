const { log } = require("console");
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connection = mysql
  .createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "rq1.0",
  })
  .promise();

let wrongpass = "";
let useremail = "";

app.post("/submitlogin", async (req, res) => {
  const { email, password } = req.body;

  const [verify] = await connection.query(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password]
  );
  if (verify.length === 0) {
    return res.json({
      success: false,
      url: "/landing",
    });
  } else {
    useremail = verify[0].email.split("@")[0];
    return res.json({
      success: true,
      url: "/landing",
      useremail: useremail,
    });
  }
});

let emailcreated = "";
app.post("/submitsignp", async (req, res) => {
  const { emailSignup, passwordSignup } = req.body;
  const [verify] = await connection.query(
    "SELECT * FROM users WHERE email =?",
    [emailSignup]
  );

  if (verify.length > 0) {
    return res.json({ emailtaken: "email is already exist" });
  } else {
    await connection.query(
      `INSERT INTO users (email, password) VALUES (?, ?)`,
      [emailSignup, passwordSignup]
    );
    useremail = emailSignup.split("@")[0];
    return res.json({
      success: true,
      url: "/landing",
      emailcreated: "Account Created",
    });
  }
});
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/landing", async (req, res) => {
  const listrooms = [];
  const listsubject = [];
  const listsection = [];
  const listuser = [];
  async function getnumber(colname, table, Type) {
    const [results] = await connection.query(
      `SELECT ${Type} ${colname} FROM ${table}`
    );

    return results.map((row) => row[colname]);
  }

  listrooms.push(await getnumber("room_name", "rooms", "DISTINCT"));
  listsubject.push(await getnumber("subject_code", "rooms", "DISTINCT"));
  listsection.push(await getnumber("section", "rooms", "DISTINCT"));
  listuser.push(await getnumber("email", "users", ""));

  res.render("landing", {
    usermail: useremail,
    listrooms,
    listsubject,
    listsection,
    listuser,
    emailcreated,
  });
});

app.get("/rooms", async (req, res) => {
  let [alldata] = await connection.query("SELECT * FROM rooms");

  arrayform = alldata.map((dat) => dat);

  /*let objectform = {};
  arrayform.forEach(dat => {
    if(!objectform[dat.room_name]){
      objectform[dat.room_name] = []
    }-
    objectform[dat.room_name].push(dat)
  });*/
  let objectform = Object.groupBy(arrayform, (dat) => dat.room_name);
  res.render("rooms", { usermail: useremail, objectform });
});

app.get("/manage", async (req, res) => {
  let [roomsAvailable] = await connection.query(
    "SELECT DISTINCT room_name From rooms"
  );

  const [faculty] = await connection.query("SELECT prof, subject FROM faculty");

  let groupedfaculty = Object.groupBy(faculty, (dat) => dat.prof);
  console.log(Array.isArray(faculty));

  let roomsAvail = roomsAvailable.map((row) => row.room_name);
  return res.render("manage", {
    usermail: useremail,
    roomsAvail,
    groupedfaculty,
  });
});
app.post("/addroom", async (req, res) => {
  let { roomName } = req.body;

  let [verify] = await connection.query(
    "SELECT * FROM rooms WHERE room_name = ?",
    [roomName]
  );

  if (roomName === "") {
    return res.json({
      success: false,
      message: "Room name connot be empty",
    });
  }

  if (verify.length > 0) {
    return res.json({
      success: false,
      message: "rooms is already existed",
    });
  } else {
    await connection.query(`INSERT INTO rooms (room_name) VALUES (?)`, [
      roomName,
    ]);
    return res.json({
      success: true,
      message: "room created",
    });
  }
});
app.post("/addsched", async (req, res) => {
  let { room, start, end, subject, section, day } = req.body;

  let [verifytime] = await connection.query(
    `SELECT * FROM rooms WHERE room_name = ?
     AND day = ?
     AND NOT (? >= end_time OR ? <= start_time)`,
    [room, day, start, end]
  );

  if (end === start) {
    return res.json({
      message: "Start and End should not be the same",
      success: false,
    });
  } else if (end < start) {
    return res.json({
      message: "Start time should be earlier than end time",
    });
  }

  if (verifytime.length > 0) {
    return res.json({
      success: false,
      message: "spot taken",
    });
  } else {
    await connection.query(
      "INSERT INTO rooms (room_name, start_time, end_time, subject_code, section ,day) VALUES (?, ?, ?, ?, ?, ?)",
      [room, start, end, subject, section, day]
    );
    return res.json({
      success: true,
      message: "schedule added",
    });
  }
});
app.get("/sections", async (req, res) => {
  const [data] = await connection.query("SELECT * FROM rooms");
  arrayformm = data.map((dat) => dat);
  objectformsecttion = Object.groupBy(
    arrayformm.filter((dat) => dat.section),
    (dat) => dat.section
  );

  res.render("sections", { usermail: useremail, objectformsecttion });
});

app.get("/faculty", async (req, res) => {
  let [facultyarr] = await connection.query("SELECT * FROM faculty");
  facultyarrobj = Object.groupBy(facultyarr, (dat) => dat.prof);
  return res.render("faculty", { usermail: useremail, facultyarrobj });
});
app.get("/feedback", async (req, res) => {
  return res.render("feedback", { usermail: useremail });
});
app.post("/addfeed", async (req, res) => {
  let { usermail, feedbackcont } = req.body;
  if (feedbackcont === "") {
    return res.json({
      message: "pls say something before submiting",
    });
  } else {
    await connection.query(
      "INSERT INTO feedback (email, feedback_cont) VALUES (?, ?)",
      [usermail, feedbackcont]
    );
    return res.json({
      message: "thank you for the feedback",
    });
  }
});
app.post("/logout", async (req, res) => {
  useremail = ""
  return res.redirect("index")
})

module.exports = app;
