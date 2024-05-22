import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { Pokemon } from "./interfaces";
import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = 3000;
const mongoURI: string | undefined = process.env.MONGO_URI ?? "";
const dbName = process.env.DB_NAME;
const port = process.env.PORT;

const client = new MongoClient(mongoURI);
let db: Db;

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Verbonden met MongoDB");
    db = client.db(dbName);
  } catch (error) {
    console.error("Fout bij het verbinden met MongoDB:", error);
  }
}

async function importPokemonDataToMongoDB() {
  try {
    const pokemonDataPath = path.join(__dirname, "pokemon.json");
    const pokemonData: Pokemon[] = await fs.promises
      .readFile(pokemonDataPath, "utf-8")
      .then((data) => JSON.parse(data));

    const collection = db.collection("pokemon");
    const result = await collection.insertMany(pokemonData);
    console.log(
      `${result.insertedCount} documents were inserted into the pokemon collection.`
    );
  } catch (error) {
    console.error(`Error importing pokemon data to MongoDB: ${error}`);
  }
}
connectToMongoDB().then(() => importPokemonDataToMongoDB());
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

    const existingAdminUser = await usersCollection.findOne({
      username: adminUser.username,
    });
    const existingUserUser = await usersCollection.findOne({
      username: userUser.username,
    });

    if (!existingAdminUser) {
      await usersCollection.insertOne(adminUser);
      console.log("Admin user added");
    }

    if (!existingUserUser) {
      await usersCollection.insertOne(userUser);
      console.log("User user added");
    }

    console.log("Default gebruikers toegevoegd");
  } catch (error) {
    console.error("Fout bij het maken van de gebruikerscollectie:", error);
  }
}
connectToMongoDB().then(() => {
  createUsersCollection();
});
async function readPokemonData(): Promise<Pokemon[]> {
  try {
    const pokemonDataPath = path.join(__dirname, "pokemon.json");
    const rawData = await fs.promises.readFile(pokemonDataPath, "utf-8");
    return JSON.parse(rawData) as Pokemon[];
  } catch (error) {
    console.error(`Error lezen pokemon data: ${error}`);
    return [];
  }
}

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.get("/index", async (req: Request, res: Response) => {
  const data = await readPokemonData();
  res.render("index", { data });
});

app.get("/", (req, res) => {
  res.render("login");
});
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Controleer of de gebruiker bestaat in de database
  const user = await db.collection("users").findOne({ username });
  if (!user) {
    return res.send("Gebruiker bestaat niet");
  }

  // Controleer of het wachtwoord klopt
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.send("Verkeerd wachtwoord");
  }

  // Als de gegevens kloppen, stuur de gebruiker naar de index.ejs pagina
  res.render("index");
});

app.get("/home", (req, res) => {
  res.render("home");
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
    res.status(400).send("geen field of order query parameters");
    return;
  }

  const data = await readPokemonData();

  if (!data.some((p) => field in p)) {
    res.status(400).send("Invalid field gespicifierd");
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
    res.status(404).send("Pokemon niet gevonden");
    return;
  }
  res.render("pokemonDetail", { pokemon });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
