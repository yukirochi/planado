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
let role = "";
let gmail = "";

app.post("/submitlogin", async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await connection.query(
    "SELECT role FROM users WHERE email = ?",
    [email]
  );
  role = rows[0]?.role;

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
    gmail = verify[0].email;
    return res.json({
      success: true,
      url: "/landing",
      useremail: useremail,
      role,
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
  let rolex = "user"
  if (verify.length > 0) {
    return res.json({ emailtaken: "email is already exist" });
  } else {
    await connection.query(
      `INSERT INTO users (email, password,role) VALUES (?, ?, ?)`,
      [emailSignup, passwordSignup, rolex]
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
    role,
  });
});

app.get("/rooms", async (req, res) => {
  let [alldata] =
    await connection.query(`SELECT * FROM rooms ORDER BY CASE day WHEN 'Sunday' THEN 1
    WHEN 'Monday' THEN 2
    WHEN 'Tuesday' THEN 3
    WHEN 'Wednesday' THEN 4
    WHEN 'Thursday' THEN 5
    WHEN 'Friday' THEN 6
    WHEN 'Saturday' THEN 7 END, start_time, end_time`);

  arrayform = alldata.map((dat) => dat);

  let objectform = Object.groupBy(arrayform, (dat) => dat.room_name);

  let [roomsAvailable] = await connection.query(
    "SELECT DISTINCT room_name From rooms"
  );

  const [faculty] = await connection.query("SELECT prof, subject FROM faculty");

  let groupedfaculty = Object.groupBy(faculty, (dat) => dat.prof);

  let roomsAvail = roomsAvailable.map((row) => row.room_name);

  res.render("rooms", {
    usermail: useremail,
    objectform,
    roomsAvail,
    groupedfaculty,
    role,
  });
});

app.get("/manage", async (req, res) => {
  let [roomsAvailable] = await connection.query(
    "SELECT DISTINCT room_name From rooms"
  );

  const [faculty] = await connection.query("SELECT prof, subject FROM faculty");

  let groupedfaculty = Object.groupBy(faculty, (dat) => dat.prof);

  let roomsAvail = roomsAvailable.map((row) => row.room_name);
  return res.render("manage", {
    usermail: useremail,
    roomsAvail,
    groupedfaculty,
    role,
  });
});
app.get("/useroption", async (req, res) => {
  let [users] = await connection.query("SELECT * FROM users");

  return res.render("useroption", {
    usermail: useremail,
    role,
    users,
  });
});
app.post("/addroom", async (req, res) => {
  let { roomName, roomNumber } = req.body;

  let uroomName = roomName.toUpperCase() + " " + roomNumber.toString();

  let [verify] = await connection.query(
    "SELECT * FROM rooms WHERE room_name = ?",
    [uroomName]
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
      uroomName.toUpperCase(),
    ]);
    return res.json({
      success: true,
      message: "room created",
    });
  }
});
app.post("/addsched", async (req, res) => {
  let { room, start, end, subject, section, day, faculty } = req.body;

  let [ifproftime] = await connection.query(
    "SELECT * FROM rooms WHERE prof = ? AND day = ? AND NOT (? >= end_time OR ? <= start_time)",
    [faculty, day, start, end]
  );
  let [iftimeexist] = await connection.query(
    "SELECT * FROM rooms WHERE section = ? AND day = ? AND NOT (? >= end_time OR ? <= start_time)",
    [section.toUpperCase(), day, start, end]
  );

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
      success: false,
    });
  }

  if (verifytime.length > 0) {
    return res.json({
      success: false,
      message: "spot taken",
    });
  } else if (iftimeexist.length > 0) {
    return res.json({
      success: false,
      message: "Same time slot in another room.",
    });
  } else if (ifproftime.length > 0) {
    return res.json({
      success: false,
      message: "times slot is not available for prof ",
    });
  } else {
    await connection.query(
      "INSERT INTO rooms (room_name, start_time, end_time, subject_code, section, day, prof) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [room, start, end, subject, section.toUpperCase(), day, faculty]
    );
    let [idver] = await connection.query("SELECT * FROM rooms WHERE section = ? AND room_name = ? AND start_time = ? AND end_time = ?",[section,room, start, end])

    let id = idver[0].ID
    function converTime(time){ let [hours, minutes] = time.split(':'); hours =
      parseInt(hours, 10); let period = hours >= 12? "PM" : "AM"; hours = hours %
      12 || 12; return `${hours}:${minutes}${period}`; }
      let strt = converTime(start)
      let ending = converTime(end)
    return res.json({
      success: true,
      message: "schedule added",
      room,
      strt,
      ending,
      subject,
      section,
      day,
      faculty,
      id
    });
  }
});
app.get("/sections", async (req, res) => {
  const [data] =
    await connection.query(`SELECT * FROM rooms ORDER BY CASE day WHEN 'Sunday' THEN 1
    WHEN 'Monday' THEN 2
    WHEN 'Tuesday' THEN 3
    WHEN 'Wednesday' THEN 4
    WHEN 'Thursday' THEN 5
    WHEN 'Friday' THEN 6
    WHEN 'Saturday' THEN 7 END, start_time, end_time`);
  arrayformm = data.map((dat) => dat);
  objectformsecttion = Object.groupBy(
    arrayformm.filter((dat) => dat.section),
    (dat) => dat.section
  );

  let [roomsAvailable] = await connection.query(
    "SELECT DISTINCT room_name From rooms"
  );

  const [faculty] = await connection.query("SELECT prof, subject FROM faculty");

  let groupedfaculty = Object.groupBy(faculty, (dat) => dat.prof);

  let roomsAvail = roomsAvailable.map((row) => row.room_name);
  res.render("sections", {
    usermail: useremail,
    objectformsecttion,
    groupedfaculty,
    roomsAvail,
    role,
  });
});

app.get("/faculty", async (req, res) => {
  let [facultyarr] = await connection.query("SELECT * FROM faculty");
  let facultyarrobj = Object.groupBy(facultyarr, (dat) => dat.prof);

  let [facultysched] =
    await connection.query(`SELECT * FROM rooms ORDER BY CASE day WHEN 'Sunday' THEN 1
    WHEN 'Monday' THEN 2
    WHEN 'Tuesday' THEN 3
    WHEN 'Wednesday' THEN 4
    WHEN 'Thursday' THEN 5
    WHEN 'Friday' THEN 6
    WHEN 'Saturday' THEN 7 END, start_time, end_time`);
  let facultyschedobj = Object.groupBy(facultysched, (dat) => dat.prof);

  const [faculty] = await connection.query("SELECT prof, subject FROM faculty");

  let groupedfaculty = Object.groupBy(faculty, (dat) => dat.prof);

  return res.render("faculty", {
    usermail: useremail,
    facultyarrobj,
    facultyschedobj,
    groupedfaculty,
    role,
  });
});
app.get("/feedback", async (req, res) => {
  return res.render("feedback", { usermail: useremail, role });
  
});
app.post("/addfeed", async (req, res) => {
  let {  feedbackcont } = req.body;
  
  if (feedbackcont === "") {
    return res.json({
      message: "pls say something before submiting",
    });
  } else {
    await connection.query(
      "INSERT INTO feedback (email, feedback_cont) VALUES (?, ?)",
      [useremail, feedbackcont]
    );
    return res.json({
      message: "thank you for the feedback",
    });
  }
});
app.post("/deletesched", async (req, res) => {
  let { deleteS } = req.body;

  const result = await connection.query("DELETE FROM rooms WHERE id = ?", [
    deleteS,
  ]);

  if (result) {
    res.json({
      success: true,
      message: "Schedule successfully deleted",
    });
  } else {
    res.json({
      success: false,
      message: "No schedule found with that ID",
    });
  }
});
app.post("/deleteschedf", async (req, res) => {
  let { deleteS, prof, subject } = req.body;

  const result = await connection.query("DELETE FROM faculty WHERE ID = ?", [
    deleteS,
  ]);
  const results = await connection.query(
    "DELETE FROM rooms WHERE subject_code = ? AND prof = ?",
    [subject, prof]
  );

  if (result || results) {
    res.json({
      success: true,
      message: "Schedule successfully deleted",
    });
  } else {
    res.json({
      success: false,
      message: "No schedule found with that ID",
    });
  }
});

app.post("/addprof", async (req, res) => {
  let { prof, units, subject } = req.body;
  let unitstring = units.toString();
  let [verify] = await connection.query(
    "SELECT * FROM faculty WHERE  prof = ? AND subject = ?",
    [prof, subject]
  );
  if (verify.length > 0) {
    res.json({
      success: false,
      message: "proffesor " + prof + " already have this subject",
    });
  } else {
    await connection.query(
      "INSERT INTO faculty (prof, subject, units) VALUES (?, ?, ?)",
      [prof, subject, unitstring]
    );
    let [idver] = await connection.query("SELECT * FROM faculty WHERE prof = ? AND subject = ?",[prof,subject])

    let id = idver[0].ID
    res.json({
      success: true,
      message: "Added Successfully",
      prof,
      units,
      subject,
      id
    });
  }
});
app.post("/logout", async (req, res) => {
  useremail = "";
  role = "";
  return res.redirect("index");
});

app.post("/updateuser", async (req, res) => {
  let { id, email, password, role } = req.body;

  let [verify] = await connection.query("SELECT * FROM users WHERE id = ?", [
    id,
  ]);

  if (
    verify[0].email === email &&
    verify[0].password === password &&
    verify[0].role === role
  ) {
    res.json({
      success: false,
      message: "No changes detected",
    });
  } else {
    await connection.query(
      "UPDATE users SET email = ?, password = ? , role = ? WHERE id =?",
      [email, password, role, id]
    );
    res.json({
      success: true,
      message: "updated sucessfully",
    });
  }
});

app.get("/account", async (req, res) => {
  let [userinfoo] = await connection.query(
    "SELECT * FROM users WHERE email = ?",
    [gmail]
  );
  let userinfo = userinfoo[0];

  return res.render("account", {
    usermail: useremail,
    role,
    userinfo,
  });
});

app.post("/accountmanage", async (req, res) => {
  let {email,password, npassword } = req.body;

  let [verify] = await connection.query("SELECT email FROM users WHERE password = ?",[password])
  if(verify.length === 0){
    res.json({
      success:false,
      message:"Your current Password is Wrong"
    })
  }
  
  if (npassword === null) {
    res.json({
      success: false,
      message: "No changes made",
    });
  } else {
    await connection.query("UPDATE users SET password = ? WHERE email =?", [
      npassword,
      email,
    ]);
    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } 
});
app.get("/feedbacks", async (req, res) => {
  let [feeddata] = await connection.query("SELECT * FROM feedback")
  return res.render("feedbacks", {
    usermail: useremail,
    role,
    feeddata
  });
})

module.exports = app;
