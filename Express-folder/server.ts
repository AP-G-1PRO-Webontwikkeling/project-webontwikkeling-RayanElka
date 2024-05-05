import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Pokemon } from './interfaces';
import { MongoClient, Db } from 'mongodb';


const app = express();
const PORT = 3000;
const mongoURI = 'mongodb+srv://Rayan:s131022@webontwikkeling.s378ort.mongodb.net/'; 
const dbName = 'my_database'; 
let db: Db;
async function connectToMongoDB() {
  try {
    const client = new MongoClient(mongoURI);
    await client.connect();
    console.log('Verbonden met MongoDB');
    db = client.db(dbName);
  } catch (error) {
    console.error('Fout bij het verbinden met MongoDB:', error);
  }
}

async function importPokemonDataToMongoDB() {
  try {
    const pokemonDataPath = path.join(__dirname, 'pokemon.json');
    const pokemonData: Pokemon[] = await fs.promises.readFile(pokemonDataPath, 'utf-8')
      .then((data) => JSON.parse(data));

    const collection = db.collection('pokemon');
    const result = await collection.insertMany(pokemonData);
    console.log(`${result.insertedCount} documents were inserted into the pokemon collection.`);
  } catch (error) {
    console.error(`Error importing pokemon data to MongoDB: ${error}`);
  }
}
connectToMongoDB().then(() => importPokemonDataToMongoDB());


async function readPokemonData(): Promise<Pokemon[]> {
  try {
    const pokemonDataPath = path.join(__dirname, 'pokemon.json');
    const rawData = await fs.promises.readFile(pokemonDataPath, 'utf-8');
    return JSON.parse(rawData) as Pokemon[];
  } catch (error) {
    console.error(`Error lezen pokemon data: ${error}`);
    return [];
  }
}

 app.use(express.static("public"));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.get('/', async (req: Request, res: Response) => {
  const data = await readPokemonData();
  res.render('index', { data });
});




app.get("/pokemon/filter", async (req: Request, res: Response) => {
  const name = req.query.name as string;
  if (!name) {
    res.status(400).send("Invalid query");
    return;
  }

  const data = await readPokemonData();
  const filteredData = data.filter(pokemon =>
    typeof pokemon.name === 'string' && pokemon.name.toLowerCase().includes(name.toLowerCase())
  );
  res.render('index', { data: filteredData });
});

app.get("/pokemon/sort", async (req: Request, res: Response) => {
  const field = req.query.field as string;
  const order = req.query.order as string;

  if (!field || !order) {
    res.status(400).send("geen field of order query parameters");
    return;
  }

  const data = await readPokemonData();

  if (!data.some(p => field in p)) {
    res.status(400).send("Invalid field gespicifierd");
    return;
  }

  const sortedData = [...data].sort((a, b) => {
    const fieldA = String(a[field]).toLowerCase();
    const fieldB = String(b[field]).toLowerCase();
    return order === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
  });

  res.render('index', { data: sortedData });
});
app.get('/pokemon/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const data = await readPokemonData();
  const pokemon = data.find(p => p.id === Number(id));
  if (!pokemon) {
    res.status(404).send("Pokemon niet gevonden");
    return;
  }
  res.render('pokemonDetail', { pokemon });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});