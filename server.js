const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const { v4: uuidv4 } = require("uuid");


const mysql = require("mysql");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

app.use(express.static("build"));

app.get("/api/rooms", (req, res) => {
  db.query("SELECT room_no FROM rooms", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.json(result);
    }
  });
});

app.post("/api/booking", (req, res) => {
  const newBooking = {
    name: req.body.name,
    email: req.body.email,
    room: req.body.room,
    startDateTime: req.body.startDateTime,
    endDateTime: req.body.endDateTime,
    price: req.body.price,
  };

  let bid;

  const checkAvailability = () => {
    const sql =
      "select count(*) as count from bookings where room_no = ? and ((stime <= ? and etime >= ?) or (stime >= ? and stime <= ?) or (etime >= ? and etime <= ?) or (stime >= ? and etime <= ?))";
    const values = [
      newBooking.room,
      newBooking.startDateTime,
      newBooking.endDateTime,
      newBooking.startDateTime,
      newBooking.endDateTime,
      newBooking.startDateTime,
      newBooking.endDateTime,
      newBooking.startDateTime,
      newBooking.endDateTime,
    ];
    db.query(sql, values, (err, result) => {
      if (err) {
        console.log("Error in checking availability", err);
        res.status(500).json({ message: "checking failed" });
        return;
      }
      const count = result[0].count;
      if (count > 0) {
        res.status(200).json({ message: "Room not available" });
      } else {
        generateBid();
      }
    });
  };

  const generateBid = () => {
    bid = uuidv4();
    const sql = "select count(*) as count from bookings where bid = ?";
    db.query(sql, bid, (err, result) => {
      if (err) {
        console.log("Error in generating bid", err);
        res.status(500).json({ message: "checking failed" });
        return;
      }
      const count = result[0].count;
      if (count > 0) {
        generateBid();
      } else {
        insertBooking();
      }
    });
  };

  const insertBooking = () => {
    const sql =
      "insert into bookings (bid, email, name, stime, etime, room_no, price) values (?, ?, ?, ?, ?, ?, ?)";
    const values = [
      bid,
      newBooking.email,
      newBooking.name,
      newBooking.startDateTime,
      newBooking.endDateTime,
      newBooking.room,
      newBooking.price,
    ];
    db.query(sql, values, (err, result) => {
      if (err) {
        console.log("booking failed", err);
        res.status(500).json({ message: "Booking failed" });
      } else {
        console.log("Booking successful", result);
        res.status(200).json({ message: "Booking successful" });
      }
    });
  };
  checkAvailability();
});

app.get("/api/bookings", (req, res) => {
  db.query("SELECT * FROM bookings", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.json(result);
    }
  });
});

app.put("/api/update", (req, res) => {
  const updateBooking = {
    id: req.body.id,
    name: req.body.name,
    email: req.body.email,
    room: req.body.room,
    startDateTime: req.body.startDateTime,
    endDateTime: req.body.endDateTime,
    price: req.body.price,
  };

  const checkAvailability = () => {
    const sql =
      "select count(*) as count from bookings where room_no = ? and bid != ? and ((stime <= ? and etime >= ?) or (stime >= ? and stime <= ?) or (etime >= ? and etime <= ?) or (stime >= ? and etime <= ?))";
    const values = [
      updateBooking.room,
      updateBooking.id,
      updateBooking.startDateTime,
      updateBooking.endDateTime,
      updateBooking.startDateTime,
      updateBooking.endDateTime,
      updateBooking.startDateTime,
      updateBooking.endDateTime,
      updateBooking.startDateTime,
      updateBooking.endDateTime,
    ];
    db.query(sql, values, (err, result) => {
      if (err) {
        console.log("Error in checking availability", err);
        res.status(500).json({ message: "checking failed" });
        return;
      }
      const count = result[0].count;
      if (count > 0) {
        res.status(200).json({ message: "Room not available" });
      } else {
        updateBookings();
      }
    });
  };

  const updateBookings = () => {
    const sql =
      "update bookings set name = ?, email = ?, stime = ?, etime = ?, room_no = ?, price = ? where bid = ?";
    const values = [
      updateBooking.name,
      updateBooking.email,
      updateBooking.startDateTime,
      updateBooking.endDateTime,
      updateBooking.room,
      updateBooking.price,
      updateBooking.id,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.log("update failed", err);
        res.status(500).json({ message: "Update failed" });
      } else {
        console.log("Update successful", result);
        res.status(200).json({ message: "Changes Saved" });
      }
    });
  };
  const updateChanges = () => {
    const sql = "select bid, room_no from bookings where bid = ?";
    db.query(sql, [updateBooking.id], (err, result) => {
      if (err) {
        console.log("update failed", err);
        res.status(500).json({ message: "Update Failed" });
      } else {
        if (result.room_no === updateBooking.room) {
          updateBookings();
        } else {
          checkAvailability();
        }
      }
    });
  };
  updateChanges();
});

app.get("/api/f_bookings", (req, res) => {
  db.query("SELECT * FROM bookings where stime >= NOW()", [], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Fetching failed" });
    } else {
      res.json(result);
    }
  });
});

app.delete("/api/f_bookings/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM bookings WHERE bid = ?", [id], (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.json(result);
    }
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
