import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { Pokemon } from "./interfaces";
import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session"; // Add this line

dotenv.config();

const app = express();
const mongoURI: string = process.env.MONGO_URI || "";
const dbName = process.env.DB_NAME || "";
const PORT = process.env.PORT || 3000;

const client = new MongoClient(mongoURI);
let db: Db;

app.use(
  session({
    secret: "your-secret-key", // Replace with your own secret key
    resave: false,
    saveUninitialized: true,
  })
);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db(dbName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

async function importPokemonDataToMongoDB() {
  try {
    const pokemonDataPath = path.join(__dirname, "pokemon.json");
    const pokemonData: Pokemon[] = await fs.promises
      .readFile(pokemonDataPath, "utf-8")
      .then((data) => JSON.parse(data));

    const collection = db.collection("pokemon");

    // Loop through each Pokemon in the data
    for (const pokemon of pokemonData) {
      // Check if the Pokemon already exists in the database
      const existingPokemon = await collection.findOne({ id: pokemon.id });

      // If the Pokemon does not exist, insert it into the database
      if (!existingPokemon) {
        await collection.insertOne(pokemon);
        console.log(`Pokemon ${pokemon.name} inserted into the database.`);
      } else {
        console.log(
          `Pokemon ${pokemon.name} already exists in the database. Skipping insertion.`
        );
      }
    }
  } catch (error) {
    console.error(`Error importing pokemon data to MongoDB: ${error}`);
  }
}

async function createUsersCollection() {
  try {
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    const adminUser = {
      username: "admin",
      password: await bcrypt.hash("adminpassword", 10),
      role: "ADMIN",
    };

    const userUser = {
      username: "user",
      password: await bcrypt.hash("userpassword", 10),
      role: "USER",
    };

    // Check if the admin user already exists
    const existingAdminUser = await usersCollection.findOne({
      username: adminUser.username,
    });

    // If the admin user does not exist, insert it into the database
    if (!existingAdminUser) {
      await usersCollection.insertOne(adminUser);
      console.log("Admin user added");
    } else {
      console.log(
        "Admin user already exists in the database. Skipping insertion."
      );
    }

    // Check if the regular user already exists
    const existingUserUser = await usersCollection.findOne({
      username: userUser.username,
    });

    // If the regular user does not exist, insert it into the database
    if (!existingUserUser) {
      await usersCollection.insertOne(userUser);
      console.log("Regular user added");
    } else {
      console.log(
        "Regular user already exists in the database. Skipping insertion."
      );
    }

    console.log("Default users added");
  } catch (error) {
    console.error("Error creating users collection:", error);
  }
}

connectToMongoDB().then(() => {
  importPokemonDataToMongoDB();
  createUsersCollection();
});

async function readPokemonData(): Promise<Pokemon[]> {
  try {
    const pokemonDataPath = path.join(__dirname, "pokemon.json");
    const rawData = await fs.promises.readFile(pokemonDataPath, "utf-8");
    return JSON.parse(rawData) as Pokemon[];
  } catch (error) {
    console.error(`Error reading pokemon data: ${error}`);
    return [];
  }
}

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.urlencoded({ extended: true }));

app.get("/index", async (req: Request, res: Response) => {
  const data = await readPokemonData();
  res.render("index", { data });
});

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return res.redirect("/index");
  }
  next();
}

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect("/"); // Redirect to login page if not authenticated
  }
}

app.get("/home", ensureAuthenticated, (req, res) => {
  res.render("home");
});

app.get("/", isAuthenticated, (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await db.collection("users").findOne({ username });
  if (!user) {
    return res.send("User does not exist");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.send("Incorrect password");
  }

  if (req.session) {
    req.session.userId = user._id; // Save user ID in session
  }
  res.redirect("/index");
});
// Route for the registration page
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});
// Route to handle user registration
app.post("/register", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Check if username already exists
  const existingUser = await db.collection("users").findOne({ username });
  if (existingUser) {
    return res.render("register", { error: "Username already exists" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user to database
    await db.collection("users").insertOne({
      username,
      password: hashedPassword,
    });

    // Redirect to login page after successful registration
    res.redirect("/");
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("/index");
      }
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  } else {
    res.redirect("/");
  }
});

app.get("/pokemon/filter", async (req: Request, res: Response) => {
  const name = req.query.name as string;
  if (!name) {
    res.status(400).send("Invalid query");
    return;
  }

  const data = await readPokemonData();
  const filteredData = data.filter(
    (pokemon) =>
      typeof pokemon.name === "string" &&
      pokemon.name.toLowerCase().includes(name.toLowerCase())
  );
  res.render("index", { data: filteredData });
});

app.get("/pokemon/sort", async (req: Request, res: Response) => {
  const field = req.query.field as string;
  const order = req.query.order as string;

  if (!field || !order) {
    res.status(400).send("Missing field or order query parameters");
    return;
  }

  const data = await readPokemonData();

  if (!data.some((p) => field in p)) {
    res.status(400).send("Invalid field specified");
    return;
  }

  const sortedData = [...data].sort((a, b) => {
    const fieldA = String(a[field]).toLowerCase();
    const fieldB = String(b[field]).toLowerCase();
    return order === "asc"
      ? fieldA.localeCompare(fieldB)
      : fieldB.localeCompare(fieldA);
  });

  res.render("index", { data: sortedData });
});

app.get("/pokemon/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  const data = await readPokemonData();
  const pokemon = data.find((p) => p.id === Number(id));
  if (!pokemon) {
    res.status(404).send("Pokemon not found");
    return;
  }
  res.render("pokemonDetail", { pokemon });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
