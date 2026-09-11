// Limpieza del banco de palabras. Ejecutar: node scripts/clean-word-bank.js
// Idempotente: aplica reglas por id/nombre y reescribe data/wordBank.csv,
// data/wordBank_translations.csv y data/category_subcategory_translations.csv.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankPath = path.join(root, 'data', 'wordBank.csv');
const trPath = path.join(root, 'data', 'wordBank_translations.csv');
const catPath = path.join(root, 'data', 'category_subcategory_translations.csv');

function parseCsv(t) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i], n = t[i + 1];
    if (c === '"' && q && n === '"') { cell += '"'; i++; }
    else if (c === '"') q = !q;
    else if (c === ',' && !q) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !q) { if (c === '\r' && n === '\n') i++; row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); if (row.some(v => v.trim())) rows.push(row); }
  return rows;
}
const esc = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const toCsv = (headers, rows) => [headers, ...rows].map(r => r.map(esc).join(',')).join('\n') + '\n';
const norm = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const S = (...names) => new Set(names.map(norm));
const parseBoolean = value => ['true', '1', 'si', 'yes'].includes(norm(String(value ?? '')));
const NON_INTERNATIONAL = S(
  'Rosalía', 'Aitana', 'David Bisbal', 'Estopa', 'Hombres G', 'Mecano', 'La Oreja de Van Gogh',
  'El Canto del Loco', 'Alejandro Sanz', 'Joaquín Sabina', 'Leiva', 'Melendi', 'Pablo Alborán',
  'Lola Índigo', 'Quevedo', 'Ana Mena', 'Manuel Carrasco', 'Malú', 'Dani Martín', 'Chenoa',
  'David Bustamante', 'Rosa López', 'Camela', 'Pablo López', 'Las Ketchup', 'Fito & Fitipaldis',
  'Héroes del Silencio', 'Rosalía de Castro', 'Campos de Castilla', 'Pedro Almodóvar',
  'Javier Gutiérrez', 'Fernando Fernán Gómez', 'Paco Rabal', 'Fernando Esteso', 'Benidorm',
  'Bilbao', 'Sevilla', 'Valencia', 'Marbella', 'Costa Brava', 'Costa del Sol', 'Mango', 'SEAT',
  'Sevilla FC', 'Valencia CF', 'Vuelta a España', 'Amancio Ortega', 'Selección española',
);

// ---------- 1. Eliminaciones (duplicados / entradas sin sentido) ----------
const REMOVE = new Set([
  645, 89, 293, 88, 235, 1061, 450, 1470, 1473, 1471, 1468, 1469, 1478, 1870, 2296, 1474, 1476, 1871, 1869, 1477, 1873,
  2826, 2829, 3883, 1868, 2297, 2298, 1872, 2299, 1475, 1874, 2827, 2828, 3519, 3563, 3827, 2966, 2970, 2967, 2971, 2972,
  3872, 2409, 2410, 2408, 1097, 3864, 3256, 1694, 2638, 3195, 3194, 2648, 2974, 2823, 3871, 1854, 1685, 2639, 1387, 3452,
  2101, 1719, 3225, 3880, 3881, 4142, 337, 2737, 636, 925, 2706, 2709, 1456, 2934, 1486, 221, 4205, 3574, 1372, 1433, 3098,
  800, 1426, 1360, 1292, 2211, 1962, 225, 1114, 1119, 1547, 1130, 1546, 479, 2332, 2334, 3729, 1522, 2319, 1568, 1407, 1408,
  4203, 4204, 4206, 4207, 4208, 4209, 4210, 4211, 2773, 3158, 4178, 2246, 3138, 253, 2336, 1913, 1914, 1915, 2988, 1390, 2363,
  3127, 2215,
].map(String));

// ---------- 2. Renombres (erratas, idioma, ambigüedad) ----------
const RENAME = {
  694: 'Hercule Poirot', 52: 'Pato Donald', 1718: "Destiny's Child", 2961: 'Isabel II de España', 3828: 'Isaac Newton',
  3829: 'René Descartes', 3879: 'Hermanos Wright', 1517: 'Batalla de las Termópilas', 1830: 'Don Quijote de la Mancha',
  1623: "Samuel Eto'o", 2910: 'Hermès París', 1816: 'León Tolstói', 2405: 'Arquímedes', 1102: 'Alfonso X el Sabio',
  2304: 'Alfonso X el Sabio', 3103: 'El efecto mariposa', 2214: 'El corredor del laberinto',
};
// 2304 queda duplicado de 1102 tras el renombre; se elimina más abajo por nombre normalizado.

// ---------- 3. Recolocaciones de categoría / subcategoría ----------
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
const MOVE = {};
const set = (ids, patch) => { for (const id of [].concat(ids).map(String)) MOVE[id] = { ...(MOVE[id] ?? {}), ...patch }; };

// Cine y TV -> Series / Películas
set([...range(1356, 1381), ...range(2241, 2250)], { categoria: 'Series', subcategoria: 'Serie' });
set(range(2732, 2740), { categoria: 'Películas', subcategoria: 'Película' });
set([2727], { categoria: 'Películas', subcategoria: 'Película' });
set([2724, 2729], { categoria: 'Películas', subcategoria: 'Saga' });
// Actores y directores fuera de Películas
set(range(2050, 2060), { categoria: 'Cine y TV', subcategoria: 'Actor/Actriz' });
set(range(2061, 2072), { categoria: 'Cine y TV', subcategoria: 'Director/a' });
// Cultura -> Arte / Literatura
set(range(1006, 1015), { categoria: 'Arte', subcategoria: 'Pintor' });
set([1018, 1019, 1020], { categoria: 'Arte', subcategoria: 'Pintor' });
set([1016, 1017], { categoria: 'Arte', subcategoria: 'Arquitectura' });
set([1021, 1022, 1023, 1025], { categoria: 'Arte', subcategoria: 'Pintura' });
set([1024], { categoria: 'Arte', subcategoria: 'Escultura' });
set(range(1026, 1044), { categoria: 'Literatura', subcategoria: 'Escritor' });
set([1029, 1032, 1036, 1042, 1043], { subcategoria: 'Escritora' });
set(range(1045, 1060), { categoria: 'Literatura', subcategoria: 'Obra' });
set([1052], { subcategoria: 'Personaje' });
// Cultura -> Personajes / Series
set([4200], { categoria: 'Personajes', subcategoria: 'Personaje' });
set([4201, 4202], { categoria: 'Series', subcategoria: 'Serie' });
set([4212], { categoria: 'Personajes', subcategoria: 'Videojuegos' });
// Historia: monumentos y ciudades -> Lugares; épocas -> Evento
set([1520, 1521, 1523, 1524, 1525, 2320, 2321, 2322], { categoria: 'Lugares', subcategoria: 'Monumento' });
set([1518, 1519, 2318], { categoria: 'Lugares', subcategoria: 'Ciudad' });
set([1507, 1513, 2313, 2315, 1517], { subcategoria: 'Evento' });
set([1508], { subcategoria: 'Civilización' });
set([2311, 2989], { subcategoria: 'Evento' });
// Obras marcadas como Persona
set([2301], { subcategoria: 'Obra' });
// Personajes literarios marcados como Obra
set([38, 39, 40, 1455, 1459, 1461, 2287, 2289, 2291, 1458, 1457, 228], { subcategoria: 'Personaje' });
set([2292], { categoria: 'Series', subcategoria: 'Animación' });
// Mitología: lugares y objetos
set([1326, 1327, 1328, 1607], { subcategoria: 'Lugar' });
set([1606], { subcategoria: 'Obra' });
// Música: grupos marcados como Persona y viceversa
set([1388, 904, ...range(2698, 2710), 2877, 3355, 3364, 2885, 2886, 3278, ...range(3279, 3297), ...range(3300, 3308),
  ...range(3311, 3329), ...range(3342, 3365), 2876], { subcategoria: 'Grupo' });
set([2276], { categoria: 'Personajes', subcategoria: 'Animación' });
// Deportes
set([1405], { categoria: 'Lugares', subcategoria: 'País' });
set([1642, 1643, 3257, 3258, 2039, 2040, 958], { subcategoria: 'Entrenador' });
set([1693], { subcategoria: 'Baloncesto' });
set([2045], { subcategoria: 'Futbolista' });
set([2261, 2262, 2263], { subcategoria: 'País' });
// Videojuegos: personajes a Personajes; consola
set([254, 255, 256], { categoria: 'Personajes', subcategoria: 'Videojuegos' });
set([260], { subcategoria: 'Consola' });
set([...range(1266, 1285), 1278], { subcategoria: 'Juegos de mesa y cartas' });

// Unificación de subcategorías redundantes (aplicada tras MOVE)
function unifySubcategory(r) {
  const c = r.categoria, s = r.subcategoria;
  const map = {
    Futbolistas: 'Futbolista', Ciudades: 'Ciudad', 'Monumentos y lugares famosos': 'Monumento', 'Marcas populares': 'Marca',
    Entrenadores: 'Entrenador', 'Actores y actrices': 'Actor/Actriz', Actor: 'Actor/Actriz', Actriz: 'Actor/Actriz',
    Directores: 'Director/a', Director: 'Director/a', 'Grupo musical': 'Grupo', 'Grupos y bandas': 'Grupo',
    'Cantantes españoles': 'Cantante', 'Cantantes internacionales': 'Cantante', Internacionales: 'Cantante',
    'Personajes históricos': 'Personaje histórico', 'Historia y cultura': 'Personaje histórico', Autores: 'Escritor',
    Obras: 'Obra', Libro: 'Obra', Novela: 'Obra', 'Obra clásica': 'Obra', 'Artistas y obras': 'Artista',
    'Dioses y criaturas': 'Mitología', Cine: 'Película', Videojuego: 'Videojuegos', 'Series internacionales': 'Serie',
  };
  let out = map[s] ?? s;
  if (c === 'Música' && (s === 'Cantante/Grupo' || s === 'Música')) out = 'Cantante';
  if (c === 'Historia' && s === 'Historia') out = 'Personaje histórico';
  if (c === 'Literatura' && (s === 'Literatura' || s === 'Autor/Obra')) out = 'Obra';
  if (c === 'Arte' && s === 'Arte') out = 'Artista';
  if (c === 'Deportes' && (s === 'Deporte' || s === 'Fútbol')) out = s;
  if (c === 'Videojuegos' && s === 'Juego') out = 'Videojuegos';
  return out;
}

// ---------- 4. Dificultad por palabra ----------
const EASY = S(
  // Deportes
  'Lionel Messi', 'Cristiano Ronaldo', 'Rafa Nadal', 'Fernando Alonso', 'Michael Jordan', 'Serena Williams', 'Diego Maradona', 'Pelé',
  'Iker Casillas', 'Fernando Torres', 'Andrés Iniesta', 'Xavi Hernández', 'Sergio Ramos', 'Zinedine Zidane', 'Ronaldinho', 'Neymar',
  'Kylian Mbappé', 'Lewis Hamilton', 'Marc Márquez', 'Usain Bolt', 'Michael Phelps', 'Tiger Woods', 'Pep Guardiola', 'Real Madrid',
  'FC Barcelona', 'Selección española', 'Mundial de Fútbol', 'Juegos Olímpicos', 'David Beckham', 'Raúl González', 'Carles Puyol',
  'Gerard Piqué', 'David Villa', 'Luis Suárez', 'Karim Benzema', 'Erling Haaland', 'Vinícius Júnior', 'Luka Modrić', 'Carlos Sainz',
  'Simone Biles', 'Muhammad Ali', 'Mike Tyson', 'Tour de Francia', 'Novak Djokovic', 'Roger Federer', 'Carlos Alcaraz', 'Lamine Yamal',
  'Pau Gasol', 'Ayrton Senna', 'Max Verstappen', 'Valentino Rossi', 'LeBron James', 'Kobe Bryant', 'Michael Schumacher', 'Atlético de Madrid',
  'Athletic Club', 'Sevilla FC', 'Real Betis', 'Manchester United', 'Liverpool', 'Arsenal', 'Chelsea', 'Juventus', 'Paris Saint-Germain',
  'Champions League', 'Eurocopa', 'Super Bowl', 'Wimbledon', 'Fórmula 1', 'MotoGP', 'NBA', 'Balón de Oro', 'Copa del Rey', 'Maratón',
  'Alexia Putellas', 'Aitana Bonmatí', 'Mireia Belmonte', 'Ricky Rubio', 'Jorge Lorenzo', 'Dani Pedrosa', 'Alberto Contador', 'Miguel Induráin',
  'Chicago Bulls', 'Los Angeles Lakers', 'Bayern de Múnich', 'Manchester City', 'Jennifer Hermoso', 'Rudy Fernández', 'Xabi Alonso',
  // Música
  'Rosalía', 'Shakira', 'Michael Jackson', 'Freddie Mercury', 'Madonna', 'Bad Bunny', 'Adele', 'Elton John', 'Elvis Presley', 'The Beatles',
  'Queen', 'ABBA', 'The Rolling Stones', 'Coldplay', 'Spice Girls', 'Backstreet Boys', 'Britney Spears', 'Lady Gaga', 'Beyoncé',
  'Jennifer Lopez', 'Ricky Martin', 'Enrique Iglesias', 'Julio Iglesias', 'Alejandro Sanz', 'David Bisbal', 'Estopa', 'Hombres G', 'Mecano',
  'La Oreja de Van Gogh', 'El Canto del Loco', 'Karol G', 'J Balvin', 'Aitana', 'Dua Lipa', 'Taylor Swift', 'Whitney Houston', 'Bob Marley',
  'Justin Bieber', 'Ed Sheeran', 'Bruno Mars', 'Miley Cyrus', 'Billie Eilish', 'Bon Jovi', 'AC/DC', 'Metallica', 'Nirvana', 'U2',
  'Rocío Jurado', 'Lola Flores', 'Isabel Pantoja', 'Raphael', 'Joaquín Sabina', 'Melendi', 'Pablo Alborán', 'Amaia', 'Lola Índigo', 'Quevedo',
  'Rihanna', 'Katy Perry', 'Eminem', 'Maluma', 'Daddy Yankee', 'Ozuna', 'Ariana Grande', 'Harry Styles', 'Selena Gomez', 'One Direction',
  'Camilo Sesto', 'Nino Bravo', 'Manolo Escobar', 'Camela', 'Las Ketchup', 'Manuel Carrasco', 'Malú', 'Pablo López', 'Chayanne', 'Luis Fonsi',
  'David Bustamante', 'Chenoa', 'Rosa López', 'Leiva', 'Dani Martín', 'Ana Mena', 'Aya Nakamura', 'Bad Gyal', 'Rauw Alejandro', 'Anuel AA',
  'Nicki Minaj', 'Snoop Dogg', 'Will Smith', 'The Weeknd', 'Sia', 'Céline Dion', 'Mariah Carey', 'Frank Sinatra', 'Camarón de la Isla',
  'Paco de Lucía', 'Fito & Fitipaldis', 'Extremoduro', 'Héroes del Silencio', 'Maná', 'Juanes', 'Imagine Dragons', 'Black Eyed Peas',
  // Cine y TV
  'Penélope Cruz', 'Antonio Banderas', 'Javier Bardem', 'Johnny Depp', 'Leonardo DiCaprio', 'Tom Hanks', 'Marilyn Monroe', 'Brad Pitt',
  'Pedro Almodóvar', 'Steven Spielberg', 'Quentin Tarantino', 'Will Smith', 'Sylvester Stallone', 'Jennifer Aniston', 'Harrison Ford',
  'Robert Downey Jr.', 'Mario Casas', 'Jackie Chan', 'Bruce Lee', 'Macaulay Culkin', 'Tom Holland', 'Zendaya', 'Margot Robbie', 'Adam Sandler',
  'John Travolta', 'Sean Connery', 'Chuck Norris', 'Jean-Claude Van Damme', 'Jason Statham', 'Daniel Craig', 'Millie Bobby Brown',
  'Jenna Ortega', 'Salma Hayek', 'Cameron Diaz', 'Natalie Portman', 'Charlize Theron', 'Matt Damon', 'Christian Bale', 'Ryan Gosling',
  'Anne Hathaway', 'Kate Winslet', 'Hugh Grant', 'Jennifer Lawrence', 'Alfredo Landa', 'Úrsula Corberó', 'Álvaro Morte', 'Tim Burton',
  'James Cameron', 'Christopher Nolan', 'George Lucas', 'Alfred Hitchcock', 'Hayao Miyazaki', 'Guillermo del Toro',
  // Personajes (todo lo icónico)
  'Mafalda', 'Tintín', 'Astérix', 'Obélix', 'Darth Vader', 'Indiana Jones', 'La Sirenita', 'Pitufina', 'Woody', 'Buzz Lightyear',
  'Mickey Mouse', 'Pato Donald', 'Goofy', 'Simba', 'Scar', 'Ariel', 'Cenicienta', 'Blancanieves', 'Peter Pan', 'Campanilla', 'Homer Simpson',
  'Bart Simpson', 'Bob Esponja', 'Scooby-Doo', 'Tom', 'Jerry', 'Superman', 'Batman', 'Spider-Man', 'Hulk', 'Iron Man', 'Thor',
  'Capitán América', 'Wonder Woman', 'Joker', 'Harley Quinn', 'Thanos', 'Hermione Granger', 'Ron Weasley', 'Gandalf', 'Frodo', 'Gollum',
  'Drácula', 'Frankenstein', 'Pinocho', 'Caperucita Roja', 'Alicia', 'Son Goku', 'Vegeta', 'Doraemon', 'Naruto Uzumaki', 'Lucky Luke',
  'Mortadelo', 'Filemón', 'Garfield', 'Snoopy', 'Charlie Brown', 'Hello Kitty', 'Pocahontas', 'Jasmine', 'Genio de Aladdín', 'Stitch',
  'Winnie the Pooh', 'Dumbo', 'Bambi', '101 dálmatas', 'Cruella de Vil', 'Maléfica', 'Capitán Garfio', 'Pumba', 'Timón', 'Gru', 'Minion',
  'Kung Fu Panda', 'Asno', 'Mowgli', 'Baloo', 'Dora la Exploradora', 'Peppa Pig', 'Pocoyó', 'Shin Chan', 'Ash Ketchum', 'Minnie Mouse',
  'Pluto', 'Olivia', 'La Pantera Rosa', 'Wally', 'Vilma Picapiedra', 'Pedro Picapiedra', 'Capitán Haddock', 'Papá Pitufo', 'Mario', 'Luigi',
  'Princesa Peach', 'Lara Croft', 'Luke Skywalker', 'Yoda', 'Chewbacca', 'Jack Sparrow', 'Marty McFly', 'Mary Poppins', 'Willy Wonka',
  'Pippi Calzaslargas', 'Zipi y Zape', 'Lisa Simpson', 'Marge Simpson', 'Bugs Bunny', 'Pato Lucas', 'Piolín', 'Shaggy', 'Lord Voldemort',
  'Nemo', 'Dory', 'Elsa', 'Anna', 'Genio', 'Úrsula', 'Bestia', 'Mr. Bean', 'Eleven', 'Freddy Krueger', 'Sonic', 'Pac-Man', 'Pikachu',
  'Popeye', 'Sancho Panza', 'Patricio Estrella', 'Calamardo', 'George Pig', 'Correcaminos', 'Coyote', 'El Pájaro Loco', 'Milú',
  'Bob el Constructor', 'Princesa Leia', 'Han Solo', 'Albus Dumbledore', 'El Zorro', 'Nala', 'Mufasa', 'Moana', 'Mike Wazowski', 'Sulley',
  'Jack Skellington', 'Olaf', 'Bella', 'Fiona', 'Gato con Botas', 'Jafar', 'Mushu', 'Pitufo', 'Velma', 'Maggie Simpson', 'Bowser',
  'Rayo McQueen', 'Wolverine', 'Lobezno', 'Optimus Prime', 'Rocky Balboa', 'Chase', 'Marshall', 'Kristoff', 'Sven', 'Trancas y Barrancas',
  'Steve de Minecraft', 'Creeper', 'Mirabel', 'Miguel Rivera', 'Baymax', 'Lilo', 'Nobita', 'Trunks', 'Krillin', 'Sasuke', 'Piccolo',
  // Películas
  'Titanic', 'Jurassic Park', 'E.T.', 'Grease', 'Rocky', 'El Rey León', 'Forrest Gump', 'Regreso al Futuro', 'Pretty Woman', 'Avatar',
  'Gladiator', 'Solo en casa', 'Matrix', 'Frozen', 'Toy Story', 'Coco', 'El Padrino', 'Dirty Dancing', 'Top Gun', 'Terminator',
  'Piratas del Caribe', 'El Señor de los Anillos', 'Los Increíbles', 'Shrek', 'Madagascar', 'Buscando a Nemo', 'Monstruos, S.A.', 'Up',
  'Ratatouille', 'La Bella y la Bestia', 'Aladdín', 'Mulán', 'Vaiana', 'Encanto', 'Barbie', 'Harry Potter', 'Star Wars',
  'La guerra de las galaxias', 'James Bond', 'Jumanji', 'La máscara', 'Mamma Mia!', 'Karate Kid', 'Rambo', 'Cars', 'Brave', 'Del revés',
  'Los Minions', 'Gru, mi villano favorito', 'Ice Age', 'Hotel Transilvania', 'Cómo entrenar a tu dragón', 'Kung Fu Panda', 'Tarzán',
  'El libro de la selva', 'Alicia en el País de las Maravillas', 'Blancanieves y los siete enanitos', 'La bella durmiente',
  'La dama y el vagabundo', 'Los aristogatos', 'Lilo y Stitch', 'Enredados', 'Wall-E', 'Soul', 'Luca', 'Elemental', 'Tiburón',
  'King Kong', 'Los cazafantasmas', 'El mago de Oz', 'Charlie y la fábrica de chocolate', 'El Hobbit', 'Las crónicas de Narnia',
  'Ocho apellidos vascos', 'Torrente', 'Campeones', 'Space Jam', 'Fast & Furious', 'Transformers', 'Los Vengadores', 'Misión: Imposible',
  'Spirit', 'Sing', 'Trolls', 'Happy Feet', 'Rio', 'Polar Express', 'Buscando a Dory', 'Big Hero 6', 'Zootrópolis', 'Bolt', 'Los Croods',
  'Super Mario Bros.: La película', 'Sonic, la película', 'Hook', 'Mascotas', 'Los Goonies', 'Robin Hood', 'Bohemian Rhapsody', 'Oppenheimer',
  'Interstellar', 'Dune', 'Los juegos del hambre', 'Crepúsculo', 'It', 'Scream', 'Saw', 'Godzilla', 'La momia', 'Aquaman', 'Deadpool',
  'Black Panther', 'Guardianes de la galaxia', 'Doctor Strange', 'X-Men', 'Capitana Marvel', 'Escuadrón Suicida', 'Flash',
  // Series
  'Friends', 'Los Simpson', 'La casa de papel', 'Juego de Tronos', 'Breaking Bad', 'Aquí no hay quien viva', 'La que se avecina', 'Aída',
  'Élite', 'Stranger Things', 'The Walking Dead', 'Heidi', 'Bola de Dragón', 'Dragon Ball', 'El Príncipe de Bel-Air', 'Los Serrano',
  'Pokémon', 'Doraemon', 'Bob Esponja', 'Peppa Pig', 'Patrulla Canina', 'Tom y Jerry', 'Los Picapiedra', 'Las Tortugas Ninja',
  'Oliver y Benji', 'Los Lunnis', 'El juego del calamar', 'Squid Game', 'Miércoles', 'The Big Bang Theory', 'Cómo conocí a vuestra madre',
  'Modern Family', 'Física o Química', 'El Internado', 'Los Caballeros del Zodiaco', 'Padre de familia', 'Hora de aventuras',
  'Phineas y Ferb', 'Power Rangers', 'Cuéntame cómo pasó', 'Verano Azul', 'Médico de familia', 'Farmacia de Guardia', 'Los hombres de Paco',
  'El barco', 'Velvet', 'Las chicas del cable', 'Vis a Vis', 'Machos Alfa', 'Paquita Salas', 'Los Pitufos', 'Looney Tunes', 'Rick y Morty',
  // Lugares
  'Torre Eiffel', 'Sagrada Familia', 'Estatua de la Libertad', 'Nueva York', 'París', 'Londres', 'Roma', 'Madrid', 'Barcelona', 'Egipto',
  'Gran Muralla China', 'Taj Mahal', 'Las Vegas', 'Disneyland', 'Big Ben', 'Coliseo de Roma', 'Pirámides de Giza', 'Machu Picchu',
  'Cristo Redentor', 'Monte Everest', 'Desierto del Sáhara', 'Islas Canarias', 'Sevilla', 'Valencia', 'Bilbao', 'Santiago de Compostela',
  'Ibiza', 'Mallorca', 'Tenerife', 'Venecia', 'Tokio', 'Hollywood', 'Disneyland París', 'Parque Güell', 'Alhambra', 'Museo del Prado',
  'Berlín', 'Atenas', 'Los Ángeles', 'Río de Janeiro', 'Buenos Aires', 'Ciudad de México', 'La Habana', 'Camp Nou', 'Santiago Bernabéu',
  'Puerta del Sol', 'Mezquita de Córdoba', 'Catedral de Santiago', 'Teide', 'Lisboa', 'Dublín', 'Ámsterdam', 'Bruselas', 'Praga', 'Viena',
  'Moscú', 'Pekín', 'Dubái', 'Miami', 'San Francisco', 'Málaga', 'Granada', 'Toledo', 'Zaragoza', 'Andalucía', 'Galicia', 'Cataluña',
  'País Vasco', 'Canarias', 'Camino de Santiago', 'Alpes', 'Andes', 'Polo Norte', 'Polo Sur', 'Hawái', 'Océano Atlántico', 'Océano Pacífico',
  'Mar Mediterráneo', 'Mediterráneo', 'Río Nilo', 'Río Amazonas', 'Amazonas', 'Muro de Berlín', 'Times Square', 'Central Park', 'Casa Blanca',
  'España', 'Portugal', 'Francia', 'Italia', 'Alemania', 'Reino Unido', 'Estados Unidos', 'México', 'Argentina', 'Brasil', 'China', 'Japón',
  'Rusia', 'India', 'Australia', 'Canadá', 'Marruecos', 'Grecia', 'Turquía', 'Cuba', 'Colombia', 'Chile', 'Perú', 'Venezuela', 'Irlanda',
  'Suiza', 'Suecia', 'Noruega', 'Países Bajos', 'Bélgica', 'Austria', 'Polonia', 'Ucrania', 'Inglaterra', 'Escocia', 'Andorra',
  'Corea del Sur', 'Corea del Norte', 'Tailandia', 'Vietnam', 'Israel', 'Arabia Saudí', 'Emiratos Árabes Unidos', 'Sudáfrica', 'Nigeria',
  'Kenia', 'Filipinas', 'Indonesia', 'Nueva Zelanda', 'Islandia', 'Dinamarca', 'Finlandia', 'Hungría', 'Croacia', 'Rumanía', 'Uruguay',
  'Ecuador', 'Bolivia', 'Paraguay', 'Guatemala', 'Costa Rica', 'Panamá', 'República Dominicana', 'Puerto Rico', 'Jamaica', 'Irán', 'Irak',
  'Pakistán', 'Afganistán', 'Siria', 'Ciudad del Vaticano', 'Mónaco', 'Malta', 'Chipre', 'Túnez', 'Argelia', 'Etiopía', 'Sierra Nevada',
  'Benidorm', 'Marbella', 'Salou', 'Formentera', 'Menorca', 'Gran Canaria', 'Lanzarote', 'Palma de Mallorca', 'Palma',
  // Marcas (globales)
  'Coca-Cola', "McDonald's", 'Lego', 'Apple', 'Google', 'Netflix', 'Amazon', 'IKEA', 'Nike', 'Adidas', 'Zara', 'Disney', 'Ferrari',
  'Mercedes-Benz', 'Volkswagen', 'Toyota', 'SEAT', 'Renault', 'Burger King', 'Starbucks', 'Pringles', 'Nutella', 'Kinder', 'Nesquik',
  'Colacao', 'Chupa Chups', 'Donuts', 'Pepsi', 'Samsung', 'Spotify', 'Microsoft', 'Porsche', 'Peugeot', 'Citroën', 'Ford', 'Danone',
  'KitKat', 'Kleenex', 'Colgate', 'Nivea', 'Gillette', 'Mango', 'H&M', 'Decathlon', 'Carrefour', 'Mercadona', 'El Corte Inglés',
  'Wallapop', 'Vinted', 'TikTok', 'Instagram', 'YouTube', 'WhatsApp', 'Uber', 'Airbnb', 'Reebok', 'Converse', 'Vans', "Levi's", 'Ray-Ban',
  'Rolex', 'Swatch', "L'Oréal", 'Fairy', 'Ferrero Rocher', 'Milka', 'Oreo', 'Red Bull', 'Monster', 'Fanta', 'Sprite', 'Canon', 'Philips',
  'Bosch', 'Xiaomi', 'Huawei', 'Play-Doh', 'Hot Wheels', 'Mattel', 'KFC', 'Nespresso', 'Nestlé', 'Puma', 'Casio', 'Pixar', 'Sega', 'Sony',
  'LG', 'Tesla', 'BMW', 'Audi', 'Honda', 'Yamaha', 'Harley-Davidson', 'Primark', 'MediaMarkt', 'Facebook', 'Telegram', 'Tinder', 'Lidl',
  'Aldi', 'Renfe', 'Jeep', 'Volvo', 'Doritos', 'Haribo', 'Marvel', 'Nokia', 'Lamborghini', 'Fiat', 'Vespa', 'Nocilla', 'Warner Bros.',
  'Bimbo', 'Toblerone', 'Gucci', 'Chanel', 'Louis Vuitton', 'Dior', 'Prada', 'Twitch', 'Intel', 'Chevrolet', 'Subway', "Domino's", 'Telepizza',
  'Lacoste', 'HBO Max', 'Prime Video', 'Kellogg\'s', 'Heinz', 'Hasbro', 'Fisher-Price', 'Timberland', 'The North Face', 'Calvin Klein',
  'Tommy Hilfiger', 'Bershka', 'Pull&Bear', 'Stradivarius', 'Massimo Dutti', 'eBay', 'AliExpress', 'Temu', 'Booking.com', 'Glovo',
  'Just Eat', 'Bizum', 'PayPal', 'Visa', 'Mastercard', 'DHL', 'Iberia', 'Vueling', 'Ryanair', 'Heineken', 'Mahou', 'Cruzcampo',
  'Estrella Galicia', 'Estrella Damm', 'San Miguel', 'Guinness', 'Corona', 'Baileys', 'Lindt', "M&M's", 'Twix', 'Mars', 'Snickers',
  'Mentos', 'Trident', 'Orbit', 'Actimel', 'Central Lechera Asturiana', 'Puleva', 'Gallina Blanca', 'La Casera', 'Repsol', 'Cepsa',
  'Iberdrola', 'Endesa', 'Movistar', 'Vodafone', 'Orange', 'Alexa', 'Google Maps', 'Gmail', 'Android', 'Windows', 'iPhone', 'iPad',
  'MacBook', 'AirPods', 'PlayStation 5', 'Nintendo', 'PlayStation', 'Xbox', 'Wii', 'Air Jordan', 'Campofrío', 'Amazon Prime', 'LinkedIn',
  // Videojuegos y juegos
  'Mario Bros', 'Tetris', 'Minecraft', 'Fortnite', 'Pokémon Go', 'FIFA', 'Los Sims', 'Grand Theft Auto', 'Mario Kart', 'Candy Crush',
  'Among Us', 'Call of Duty', 'Wii Sports', 'Just Dance', 'Cluedo', 'Monopoly', 'Trivial Pursuit', 'Pictionary', 'Jenga', 'Twister',
  'Operación', 'Hundir la flota', 'Conecta 4', 'Quién es quién', 'Cubo de Rubik', 'Bingo', 'Dominó', 'Ajedrez', 'Damas', 'Parqués', 'UNO',
  'Super Mario Bros.', 'Angry Birds', 'Roblox', 'Brawl Stars', 'La oca', 'Cartas', 'Solitario', 'Parcheesi', 'Sonic the Hedgehog', 'Clash Royale',
  'Animal Crossing', 'Mario Party', 'The Legend of Zelda', 'Zelda', 'Donkey Kong', 'Pokémon',
  // Historia / Ciencia / Cultura muy conocidos
  'Napoleón', 'Julio César', 'Cristóbal Colón', 'Mahatma Gandhi', 'Nelson Mandela', 'Adolf Hitler', 'Cleopatra', 'Tutankamón', 'Che Guevara',
  'Abraham Lincoln', 'Reina Isabel II', 'Martin Luther King', 'Neil Armstrong', 'Alejandro Magno', 'Walt Disney', 'Steve Jobs', 'Bill Gates',
  'Elon Musk', 'Donald Trump', 'Barack Obama', 'Francisco Franco', 'Jesús', 'Buda', 'Moisés', 'Papa Francisco', 'Kim Kardashian',
  'Stephen Hawking', 'Albert Einstein', 'Isaac Newton', 'Leonardo da Vinci', 'Miguel Ángel', 'Pablo Picasso', 'Salvador Dalí',
  'Vincent van Gogh', 'Frida Kahlo', 'La Gioconda', 'Miguel de Cervantes', 'William Shakespeare', 'J. K. Rowling', 'Don Quijote',
  'Sherlock Holmes', 'Romeo y Julieta', 'Hansel y Gretel', 'Pulgarcito', 'Rapunzel', 'Alí Babá', 'Don Quijote de la Mancha',
  'El Principito', 'Zeus', 'Hércules', 'Medusa', 'Dragón', 'Unicornio', 'Sirena', 'Vampiro', 'Zombi', 'Bruja', 'Hada', 'Momia',
  'Hombre lobo', 'Fénix', 'Ogro', 'Elfo', 'Mago', 'Duende', 'Gnomo', 'Troll', 'Merlín', 'Cupido', 'Pegaso', 'Poseidón', 'Afrodita',
  'Segunda Guerra Mundial', 'Primera Guerra Mundial', 'Revolución Francesa', 'Llegada a la Luna', 'Guerra Civil Española', 'Imperio Romano',
  'Antiguo Egipto', 'Edad Media', 'Renacimiento', 'Descubrimiento de América', 'Hundimiento del Titanic', 'Caída del Muro de Berlín',
  // Naturaleza
  'Orangután', 'Lince', 'Murciélago', 'Calamar', 'Halcón', 'Caimán', 'Avispa', 'Saltamontes', 'Gusano',
);

const HARD = S(
  // Deportes menos populares
  'Rio Ferdinand', 'Gaizka Mendieta', 'Marit Bjørgen', 'Fabio Wibmer', 'Rafaela Silva', 'Marianne Vos', 'Allyson Felix', 'Paula Radcliffe',
  'Wayne Gretzky', 'Jon Jones', 'Johan Neeskens', 'Bobby Charlton', 'Gianfranco Zola', 'Clarence Seedorf', 'Dennis Bergkamp', 'Yaya Touré',
  'Diego Forlán', 'Keylor Navas', 'Rafael Márquez', 'Guillermo Ochoa', 'Marta Vieira', 'Megan Rapinoe', 'Katie Ledecky', 'Eliud Kipchoge',
  'Jonas Vingegaard', 'Mark Cavendish', 'Peter Sagan', 'Tony Parker', 'Manu Ginóbili', 'Kyrie Irving', 'Russell Westbrook', 'Vince Carter',
  'Dwyane Wade', 'Alisson Becker', 'Ederson', 'Jan Oblak', 'Emiliano Martínez', 'José Ángel Iribar', 'Luis Arconada', 'Iván Helguera',
  'Marchena', 'Míchel Salgado', 'Joan Capdevila', 'Thiago Silva', 'Marquinhos', 'Nemanja Vidić', 'Ashley Cole', 'Gary Neville',
  'Philipp Lahm', 'Ruud van Nistelrooy', 'Wesley Sneijder', 'Frank Rijkaard', 'Edgar Davids', 'George Weah', "N'Golo Kanté", 'Hernán Crespo',
  'Zico', 'Gerd Müller', 'Lothar Matthäus', 'Mats Hummels', 'Harry Maguire', 'Phil Foden', 'Jack Grealish', 'Cole Palmer', 'Declan Rice',
  'Martin Ødegaard', 'Takefusa Kubo', 'Kaoru Mitoma', 'Ritsu Doan', 'Christian Pulisic', 'Weston McKennie', 'Tim Weah', 'Alphonso Davies',
  'Achraf Hakimi', 'Sofyan Amrabat', 'Victor Osimhen', 'Khvicha Kvaratskhelia', 'Nicolás Otamendi', 'Ángel Correa', 'Darwin Núñez',
  'Luis Díaz', 'Endrick', 'Raphinha', 'Aymeric Laporte', 'Nacho Fernández', 'Javi Martínez', 'David Albelda', 'Bill Shankly', 'Brian Clough',
  'Gigi Riva', 'Franco Baresi', 'Miroslav Klose', 'Laia Palau', 'José Calderón', 'Felipe Reyes', 'Juan Carlos Navarro', 'Amaya Valdemoro',
  'Fernando Martín', 'Rafael Martín Vázquez', 'Yelena Isinbayeva', "Ronnie O'Sullivan", 'Michael Johnson', 'Carlos Sainz padre', 'Pedro Delgado',
  'Mia Hamm', 'Nadia Comăneci', 'Alberto Ginés', 'Teresa Perales', 'Carolina Marín', 'Iker Muniain', 'Jesús Navas', 'Dani Carvajal',
  'Thibaut Courtois', 'Toni Kroos', 'Kevin De Bruyne', 'Andrea Pirlo', 'Gianluigi Donnarumma', 'Ryan Giggs', 'Frank Lampard', 'Cesc Fàbregas',
  'Sergio Scariolo', 'Ángel Nieto', 'Álex Crivillé', 'Ronald Koeman', 'Conchita Martínez', 'Arantxa Sánchez Vicario', 'Garbiñe Muguruza',
  'Green Bay Packers', 'New England Patriots', 'Chicago Cubs', 'Los Angeles Dodgers', 'New York Yankees', 'Golden State Warriors',
  'Boston Celtics', 'Dallas Cowboys', 'Miami Heat', 'Real Sociedad', 'Tottenham', 'Benfica', 'Porto', 'Villarreal CF', 'Ajax',
  'Borussia Dortmund', 'Inter de Milán', 'AC Milan', 'Boca Juniors', 'River Plate', 'Giro de Italia', 'Vuelta a España', 'US Open',
  'Masters de Augusta', 'Rally Dakar', 'Copa Davis', 'Roland Garros', 'Bota de Oro', 'Triatlón',
  // Música menos conocida
  'Manic Street Preachers', 'Moloko', 'Skunk Anansie', 'Garbage', 'Texas', 'The Corrs', 'The Script', 'Travis', 'Keane', 'Snow Patrol',
  'The Kooks', 'The Libertines', 'The Hives', 'The White Stripes', 'Franz Ferdinand', 'Placebo', 'Dio', 'Manowar', 'Nightwish', 'Whitesnake',
  'Def Leppard', 'Tears for Fears', 'Portishead', 'Massive Attack', 'Chemical Brothers', 'The Prodigy', 'Fatboy Slim', 'Moby', 'Korn',
  'Limp Bizkit', 'Slipknot', 'System of a Down', 'Alice in Chains', 'Soundgarden', 'The Smashing Pumpkins', 'Panic! at the Disco',
  'My Chemical Romance', 'Fall Out Boy', 'Sum 41', 'Paramore', 'The Cardigans', 'Christine and the Queens', 'Angèle', 'Stromae',
  'Bette Midler', 'Liza Minnelli', 'Carly Simon', 'Fergie', 'Nelly Furtado', 'Kesha', 'Halsey', 'Lizzo', 'Megan Thee Stallion',
  'Mary J. Blige', 'Viva Suecia', 'Love of Lesbian', 'Pignoise', 'La Casa Azul', 'Los Ronaldos', 'Izal', 'Molotov', 'Rubén Blades',
  'Celia Cruz', 'Yandel', 'Massiel', 'Twenty One Pilots', 'Billie Joe Armstrong', 'Keith Richards', 'Bonnie Tyler', 'Chappell Roan',
  'Cardi B', 'Travis Scott', 'Post Malone', 'Akon', 'Doja Cat', 'Kortatu', 'La Polla Records', 'Zahara', 'David Otero', 'Antonio Flores',
  'Bunbury', 'Westlife', 'Take That', 'Boyzone', 'S Club 7', 'Sugababes', 'All Saints', 'Little Mix', 'Fifth Harmony', 'The Pussycat Dolls',
  'Girls Aloud', '5 Seconds of Summer', 'Blue', 'Vengaboys', 'Ace of Base', 'Modern Talking', 'Earth, Wind & Fire', 'The Supremes',
  'The Temptations', 'Kansas', 'Foreigner', 'Journey', 'Toto', 'Survivor', 'Rick Astley', 'Seal', 'Lenny Kravitz', 'John Mayer',
  'Jason Mraz', 'James Blunt', 'Paolo Nutini', 'Amy Macdonald', 'Norah Jones', 'Dido', 'Sophie Ellis-Bextor', 'Måneskin', 'Aqua',
  'Rammstein', 'Motörhead', 'Judas Priest', 'Alice Cooper', 'Marilyn Manson', 'The Strokes', 'Kings of Leon', 'The Vamps', 'Bastille',
  'Dean Martin', 'Nat King Cole', 'Lionel Richie', 'Tom Jones', 'Andrea Bocelli', 'Pavarotti', 'Led Zeppelin', 'The Beach Boys', 'OneRepublic',
  'The Killers', 'Gorillaz', 'NSYNC', 'Alaska y Dinarama', 'Soda Stereo', 'Los Rodríguez', 'Café Tacvba', 'RBD', 'Rage Against the Machine',
  'The Offspring', 'Blink-182', 'Marvin Gaye', 'Sting', 'Diana Ross', 'Janis Joplin', 'Louis Armstrong', 'James Brown', 'Shania Twain',
  'Foo Fighters', 'Duran Duran', 'Radiohead', 'Los Secretos', 'Fito Cabrales', 'Nathy Peluso', 'Duki', 'Mala Rodríguez', 'C. Tangana',
  'Rels B', 'Rozalén', 'Bebe', 'Soraya Arnelas', 'Pastora Soler', 'Vanesa Martín', 'India Martínez', 'Ringo Starr', 'Bob Dylan', 'Billy Joel',
  'Barbra Streisand', 'Mägo de Oz', 'Manolo García', 'Antonio Orozco', 'Marta Sánchez', 'Sergio Dalma', 'José Luis Perales', 'Ana Belén',
  'Víctor Manuel', 'Luz Casal', 'Dani Fernández', 'Álex Ubago', 'Sam Smith', 'Jennifer Hudson', 'Usher', 'Alicia Keys', 'Jason Derulo',
  'Dr. Dre', 'Kendrick Lamar', 'Notorious B.I.G.', 'El Último de la Fila', 'Celtas Cortos', 'Vetusta Morla', 'Amaral', 'Pereza',
  'Jarabe de Palo', 'Ska-P', 'The Cure', 'Muse', 'Arctic Monkeys', 'Daft Punk', 'Blur', 'The Doors', 'The Who', 'Kiss', 'Iron Maiden',
  'Deep Purple', 'Fleetwood Mac', 'Bee Gees', 'Simon & Garfunkel', 'Simply Red', 'Pet Shop Boys', 'Jamiroquai', 'Dover', 'La Quinta Estación',
  'La Unión', 'Presuntos Implicados', 'Seguridad Social', 'M-Clan', 'Nacha Pop', 'Duncan Dhu', 'Siniestro Total', 'George Harrison',
  'Rod Stewart', 'Jimi Hendrix', 'Morad', 'Don Omar', 'Carlos Vives', 'Enya', 'Jim Morrison', 'Kurt Cobain', 'Ray Charles', 'Stevie Wonder',
  'Cyndi Lauper', 'Aretha Franklin', 'Tina Turner', 'Cher', 'Johnny Cash', 'Amy Winehouse', 'Avril Lavigne', 'Christina Aguilera',
  'Justin Timberlake', 'Guns N\' Roses', 'Aerosmith', 'Red Hot Chili Peppers', 'Green Day', 'Linkin Park', 'The Police', 'Depeche Mode',
  'Roxette', 'Eurythmics', 'Boney M.', 'Village People', 'Dire Straits', 'R.E.M.', 'The Cranberries', 'Joan Manuel Serrat', 'Mónica Naranjo',
  'Miguel Bosé', 'Niña Pastori', 'Rosario Flores', 'Wham!', 'A-ha', 'Ozzy Osbourne', 'Mick Jagger', 'Sabrina Carpenter', 'Tupac', '50 Cent',
  'Maroon 5', 'Pink', 'P!nk', 'Camila Cabello', 'Evanescence', 'Pearl Jam', 'Jonas Brothers', 'The Jackson 5', 'Alanis Morissette',
  'Dolly Parton', 'Judy Garland', 'Bryan Adams', 'Phil Collins', 'George Michael', 'Prince', 'David Bowie', 'Bruce Springsteen', 'Oasis',
  'Paul McCartney', 'John Lennon',
  // Cine y TV menos conocidos
  'Alicia Vikander', 'Viola Davis', 'Gene Kelly', 'Jet Li', 'Christopher Walken', 'Michelle Yeoh', 'Wes Anderson', 'Paco León', 'Inma Cuesta',
  'Adriana Ugarte', 'Blanca Suárez', 'Miguel Ángel Silvestre', 'Mark Ruffalo', 'Rupert Grint', 'Colin Firth', 'Benedict Cumberbatch',
  'Jude Law', 'Ewan McGregor', 'Ian McKellen', 'Patrick Stewart', 'Gary Oldman', 'Ralph Fiennes', 'Cillian Murphy', 'Chris Rock',
  'Steve Carell', 'Bill Murray', 'Owen Wilson', 'Ben Stiller', 'Chris Pratt', 'Andrew Garfield', 'Joaquin Phoenix', 'Jake Gyllenhaal',
  'Edward Norton', 'Bradley Cooper', 'Jared Leto', 'Matthew McConaughey', 'Woody Harrelson', 'Jeff Bridges', 'Jamie Lee Curtis',
  'Cate Blanchett', 'Reese Witherspoon', 'Courteney Cox', 'Lisa Kudrow', 'Sarah Jessica Parker', 'Belén Cuesta', 'Carmen Machi',
  'Candela Peña', 'Najwa Nimri', 'Bárbara Lennie', 'Javier Gutiérrez', 'Karra Elejalde', 'Eduard Fernández', 'Luis Zahera', 'José Sacristán',
  'Fernando Fernán Gómez', 'Paco Rabal', 'Lola Dueñas', 'Victoria Abril', 'Rosa María Sardà', 'Chus Lampreave', 'Agustín González',
  'José Luis López Vázquez', 'Fernando Esteso', 'Andrés Pajares', 'Daniel Day-Lewis', 'Michael Caine', 'Kevin Costner', 'Richard Gere',
  'Rami Malek', 'Oscar Isaac', 'Adam Driver', 'Mads Mikkelsen', 'Christoph Waltz', 'Pierce Brosnan', 'Roger Moore', 'Timothée Chalamet',
  'Florence Pugh', 'Anya Taylor-Joy', 'Sydney Sweeney', 'Paul Mescal', 'Carmen Maura', 'Maribel Verdú', 'Luis Tosar', 'Belén Rueda',
  'Paz Vega', 'Sigourney Weaver', 'Uma Thurman', 'Michelle Pfeiffer', 'Drew Barrymore', 'Ben Affleck', 'Nicolas Cage', 'Dustin Hoffman',
  'Mel Gibson', 'Meryl Streep', 'Al Pacino', 'Peter Jackson', 'Robert Zemeckis', 'James Wan', 'David Fincher', 'Denis Villeneuve', 'Wes Craven',
  'Jordan Peele', 'Alejandro González Iñárritu', 'Alfonso Cuarón', 'Álex de la Iglesia', 'Juan Antonio Bayona', 'Isabel Coixet',
  'Fernando León de Aranoa', 'Fernando Trueba', 'Alejandro Amenábar', 'Rodrigo Sorogoyen', 'Daniel Monzón', 'Jaime de Armiñán',
  'Luis García Berlanga', 'José Luis Garci', 'Carlos Saura', 'Víctor Erice', 'Pilar Miró', 'Icíar Bollaín', 'Gracia Querejeta',
  'Emilio Martínez Lázaro', 'Javier Fesser', 'José Luis Cuerda', 'Agustí Villaronga', 'Bigas Luna', 'Jaime Chávarri', 'Montxo Armendáriz',
  'Ken Loach', 'Stanley Kubrick', 'Orson Welles', 'Billy Wilder', 'Akira Kurosawa', 'Satoshi Kon', 'Wong Kar-wai', 'Ang Lee', 'Bong Joon-ho',
  'Park Chan-wook', 'Hirokazu Kore-eda', 'Federico Fellini', 'Ingmar Bergman', 'François Truffaut', 'Jean-Luc Godard', 'Jean Renoir',
  'Sofia Coppola', 'Greta Gerwig', 'Kathryn Bigelow', 'Chloé Zhao', 'Jane Campion', 'Lana Wachowski', 'Lilly Wachowski', 'Sergio Leone',
  'Clint Eastwood', 'Mel Brooks', 'Woody Allen', 'Spike Lee', 'David Lynch', 'Terry Gilliam', 'Takeshi Kitano', 'Martin Scorsese',
  'Ridley Scott', 'Francis Ford Coppola',
  // Personajes poco conocidos
  'Sackboy', 'Q*bert', 'Doomguy', 'Duke Nukem', 'Bobobo', 'Iznogoud', 'Gaston Lagaffe', 'Corto Maltés', 'Pyramid Head', 'Sora', 'Waluigi',
  'Samus Aran', 'Solid Snake', 'Cloud Strife', 'Sephiroth', 'Arthur Morgan', 'Ezio Auditore', 'Altair', 'Nathan Drake', 'Ellie Williams',
  'Joel Miller', 'Kratos', 'Master Chief', 'Chun-Li', 'Ryu', 'Ken', 'Sub-Zero', 'Scorpion', 'Knuckles', 'Tails', 'Ganondorf', 'Brock', 'Misty',
  'Vanellope', 'Ralph', 'Hiro Hamada', 'Bruno Madrigal', 'Yzma', 'Oogie Boogie', 'Lotso', 'Forky', 'Pinky', 'Taz', 'Omar Little', 'Don Draper',
  'Thomas Shelby', 'Dexter Morgan', 'Amélie Poulain', 'Tyler Durden', 'Tony Montana', 'Trinity', 'Katniss Everdeen', 'Megatron', 'Addams',
  'Brian Griffin', 'Stewie Griffin', 'Peter Griffin', 'Vecna', 'Cersei Lannister', 'Monica Geller', 'Chandler Bing', 'Joey Tribbiani',
  'Ross Geller', 'Rachel Green', 'Leonard Hofstadter', 'Sheldon Cooper', 'Dwight Schrute', 'Michael Scott', 'Jesse Pinkman', 'Barney Stinson',
  'Carmen Sandiego', "D'Artagnan", 'She-Ra', 'Skeletor', 'He-Man', 'Jessie', 'Mr. Potato', 'Darth Maul', 'Zoro', 'Nami', 'Arenita', 'Fred',
  'Daphne', 'Astroboy', 'Caillou', 'Wallace', 'Gromit', 'Pepe Le Pew', 'Thomas la Locomotora', 'La Reina Malvada', 'Hipo', 'Chimuelo',
  'Calvin', 'Hobbes', 'Calimero', 'Tigger', 'Po', 'Luffy', 'Monkey D. Luffy', 'Sailor Moon', 'Zipi', 'Zape', 'Superlópez', 'Capitán Trueno',
  'Silvestre', 'Bilbo Bolsón', 'Robin', 'Remy', 'Walter White', 'Jon Snow', 'Groot', 'Wednesday Addams', 'Saul Goodman', 'Daenerys Targaryen',
  'Tyrion Lannister', 'Doctor Watson', 'Mandaloriano', 'Geralt de Rivia', 'Aragorn', 'Legolas', 'Draco Malfoy', 'Viuda Negra', 'Hawkeye',
  'John McClane', 'Hannibal Lecter', 'Norman Bates', 'Vito Corleone', 'Doc Brown', 'Seiya de Pegaso', 'Link', 'C-3PO', 'R2-D2', 'Betty Boop',
  'Kim Possible', 'Piglet', 'Mad Hatter', 'Reina de Corazones', 'Lightning McQueen', 'Eva', 'Héctor', 'Ryder', 'Peach', 'Alex', 'Neo',
  'Rick Sánchez', 'Morty Smith', 'Harry el Sucio',
  // Películas menos conocidas
  'Viridiana', 'Master and Commander', 'Stardust', 'El emperador y sus locuras', 'Black Hawk derribado', 'El milagro de P. Tinto', 'Plácido',
  'El verdugo', 'Truman', 'Dolor y gloria', 'Your Name', 'Zodiac', 'Eragon', 'Speed', 'Desayuno con diamantes', 'Rango', 'Megamind',
  'Monstruos contra alienígenas', 'El buen dinosaurio', 'Los Mitchell contra las máquinas', 'Oliver y su pandilla', 'El gigante de hierro',
  'La princesa Mononoke', 'Atlantis: El imperio perdido', 'El planeta del tesoro', 'La huérfana', 'El corredor del laberinto', 'Reservoir Dogs',
  'Tron', 'Fama', 'Flashdance', 'El apartamento', 'Doctor Zhivago', 'Lawrence de Arabia', 'Pagafantas', 'Secretos del corazón', 'El bola',
  'Villaviciosa de al lado', 'Kiki, el amor se hace', 'El reino', 'Mientras dure la guerra', 'La mala educación', 'Rocketman', 'Black Adam',
  'Shazam!', 'Creed', 'Depredador', 'Erin Brockovich', 'Thelma y Louise', 'Big Fish', 'Chicken Run', 'La terminal', 'Contact', 'La llegada',
  'Apolo 13', 'El patriota', 'Los intocables de Eliot Ness', 'La vida de Brian', 'Intocable', 'Amélie', 'Slumdog Millionaire',
  'El discurso del rey', 'El pianista', 'Tiempos modernos', 'El gran dictador', 'Espartaco', 'Sin City', 'Watchmen', 'Ted', 'Superbad',
  'Supersalidos', 'Zoolander', 'Full Monty', 'Billy Elliot', 'Platoon', 'Apocalypse Now', 'La ventana indiscreta', 'Vértigo', 'Heat', 'Casino',
  'Uno de los nuestros', 'American Beauty', 'Memento', 'Érase una vez en Hollywood', 'El gran Lebowski', 'Dos policías rebeldes',
  'El príncipe de Zamunda', 'Willow', 'Cuenta conmigo', 'Footloose', 'Spirit: El corcel indomable', 'El príncipe de Egipto', 'Coraline',
  'El castillo ambulante', 'Ponyo', 'Mi vecino Totoro', 'Relatos salvajes', 'El secreto de sus ojos', 'Divergente', 'La cosa', 'Carrie',
  'Ocean\'s Eleven', 'Ángeles y demonios', 'Troya', '300', 'Náufrago', 'El show de Truman', 'Wallace y Gromit', 'Matilda', 'Ready Player One',
  'Gravity', 'Legalmente rubia', 'La señora Doubtfire', 'Sister Act', 'El diablo viste de Prada', 'Big', 'Atrápame si puedes', 'Bridget Jones',
  'La lengua de las mariposas', 'Los santos inocentes', 'El día de la bestia', 'La comunidad', 'Primos', 'Spanish Movie',
  'Las brujas de Zugarramurdi', 'Abre los ojos', 'Tesis', 'Hable con ella', 'Todo sobre mi madre', '¿Qué he hecho yo para merecer esto?',
  'Mujeres al borde de un ataque de nervios', 'Cantando bajo la lluvia', 'Sonrisas y lágrimas', 'West Side Story', 'Logan',
  'Los cuatro fantásticos', 'Encuentros en la tercera fase', '2001: Una odisea del espacio', 'El planeta de los simios', 'Celda 211',
  'Contratiempo', 'Perfectos desconocidos', 'Mar adentro', 'Volver', 'REC', 'El orfanato', 'La sociedad de la nieve', 'Ocho apellidos catalanes',
  'Bienvenido, Mister Marshall', 'La escopeta nacional', 'Amanece, que no es poco', 'Airbag', 'Tres metros sobre el cielo', 'El diario de Noa',
  'Cuando Harry encontró a Sally', 'La princesa prometida', 'Beetlejuice', 'Gremlins', 'Robocop', 'El quinto elemento', 'Origen',
  'La jungla de cristal', 'Pesadilla antes de Navidad', 'Eduardo Manostijeras', 'El último samurái', 'Pearl Harbor', 'Armageddon',
  'Independence Day', 'Men in Black', 'Ace Ventura', 'Dos tontos muy tontos', 'American Pie', 'Scary Movie', 'El diario de Bridget Jones',
  'Notting Hill', 'Love Actually', 'El guardaespaldas', 'Moulin Rouge!', 'Chicago', 'Million Dollar Baby', 'Kingsman', 'Mad Max',
  'Blade Runner', 'Ben-Hur', 'Con faldas y a lo loco', 'Psicosis', 'El resplandor', 'El exorcista', 'El sexto sentido',
  'El silencio de los corderos', 'Seven', 'Dune', 'Barbie', 'Kill Bill', 'La milla verde', 'Pesadilla en Elm Street', 'Viernes 13',
  'Django desencadenado', 'El club de la lucha', 'Cadena perpetua', 'Scarface', 'El curioso caso de Benjamin Button', 'Sospechosos habituales',
  'American Psycho', 'Full Metal Jacket', 'Dunkerque', 'Dirty Harry', 'Arma letal', 'Con Air', 'Face/Off', 'Akira', 'Los padres de ella',
  'Piratas', 'Narnia', 'Percy Jackson', 'Conan', 'Catwoman', 'Casablanca', 'Cinema Paradiso', 'Paddington', 'Stuart Little', 'John Wick',
  'Pacific Rim', 'Deep Impact', 'Stargate', 'District 9', 'Elysium', 'La guerra de los mundos', 'A.I. Inteligencia Artificial',
  'Minority Report', 'Blade Runner 2049', 'Tenet', 'Shutter Island', 'El lobo de Wall Street', 'Nomadland', 'Todo a la vez en todas partes',
  'Parásitos', 'Moonlight', '12 años de esclavitud', 'Argo', 'Spotlight', 'Birdman', 'Babel', 'Crash', 'American History X',
  'Réquiem por un sueño', 'Cisne negro', 'El proyecto de la bruja de Blair', 'The Ring', 'It Follows', 'La bruja', 'Un lugar tranquilo',
  'Déjame salir', 'Midsommar', 'Hereditary', 'Sinister', 'Insidious', 'Expediente Warren', 'Destino final', 'Poltergeist', 'La profecía',
  'Monsters University', 'Ralph rompe Internet', 'Aviones', 'Hop', 'Arthur Christmas', 'Klaus', "Five Nights at Freddy's", 'Asterix y Obelix',
  'Los lunes al sol', 'Algo pasa con Mary', 'Mentiroso compulsivo', 'El efecto mariposa', 'Detective Pikachu', 'La novia cadáver',
  'El bueno, el feo y el malo', 'Por un puñado de dólares', 'Érase una vez en América', 'Érase una vez en el Oeste', 'Drácula de Bram Stoker',
  'El fantasma de la ópera', 'Noche en el museo', 'Star Trek', 'Wonka', 'Cruella', 'La naranja mecánica', '1917', 'La La Land',
  'El gran showman', 'Salvar al soldado Ryan', 'La lista de Schindler', 'El viaje de Chihiro', 'El laberinto del fauno', 'Los otros',
  // Series menos conocidas
  'Doctor Who', 'MacGyver', 'El Equipo A', 'Los vigilantes de la playa', 'Alf', 'Malcolm', 'Mujeres desesperadas', 'Sexo en Nueva York',
  'Anatomía de Grey', 'House', 'Dexter', 'Peaky Blinders', 'The Witcher', 'Narcos', 'Los Bridgerton', 'The Mandalorian', 'The Boys',
  'Entrevías', 'Veneno', 'Fariña', "D'Artacán y los tres mosqueperros", 'Perdidos', 'Prison Break', 'The Office', 'Black Mirror',
  'The Crown', 'Vikingos', 'The Last of Us', 'Los Soprano', 'Better Call Saul', 'Sherlock', 'Downton Abbey', 'Chernobyl', 'Cobra Kai', 'Loki',
  'WandaVision', 'Daredevil', 'Dos hombres y medio', 'Brooklyn Nine-Nine', 'Ana y los 7', 'Amar en tiempos revueltos', 'El secreto de Puente Viejo',
  'La catedral del mar', 'El tiempo entre costuras', 'Estoy vivo', 'El pueblo', 'South Park', 'Futurama', 'Los Supersónicos',
  'Inspector Gadget', 'He-Man y los Masters del Universo', 'Digimon', 'One Piece', 'Ataque a los titanes', 'Mazinger Z', 'Marco',
  'La abeja Maya', 'Al salir de clase', 'Gran Hotel', 'Los ladrones van a la oficina', 'Manos a la obra', 'Camera Café', 'Hospital Central',
  'Policías, en el corazón de la calle', 'El príncipe', 'Rapa', '24', 'The Wire', 'Mindhunter', 'The Umbrella Academy', 'Urgencias', 'CSI',
  'NCIS', 'Buffy, cazavampiros', 'Embrujadas', 'Twin Peaks', 'Ally McBeal', 'Salvados por la campana', 'Cosas de casa', 'El coche fantástico',
  'Xena: la princesa guerrera', 'Hércules: sus viajes legendarios', 'Stargate SG-1', 'Smallville', 'Héroes', 'Ted Lasso', 'Spartacus',
  'Boardwalk Empire', "The Handmaid's Tale", 'Mr. Robot', 'Westworld', 'House of the Dragon', 'Lupin', 'La asistenta', 'The White Lotus',
  'The Good Place', 'Community', 'Bleach', 'Death Note', 'Detective Conan', 'Rugrats', 'Steven Universe', 'BoJack Horseman', 'Big Mouth',
  'Águila Roja', 'Policías', 'Los misterios de Laura', 'Mentes criminales', 'Bones', 'Sensación de vivir', 'Obi-Wan Kenobi', 'You', 'Fargo',
  'True Detective', 'Alice in Borderland', 'La peste', 'Cristo y Rey', '7 vidas', 'La Casa de las Flores', 'Seinfeld', 'Merlí',
  'El Ministerio del Tiempo', 'Un paso adelante', 'Compañeros', 'Los Protegidos', 'Expediente X', 'Dallas', 'Dinastía', 'Cheers', 'Embrujada',
  'Los Roper', 'Scrubs', 'Hijos de la Anarquía', 'Dark', 'Ozark', 'The Bear', 'Succession', 'Yellowstone', 'The Good Doctor', 'La Unidad',
  '30 monedas', 'Antidisturbios', 'La Mesías', 'Aquí no hay quien viva: Desengaño 21', 'Los Aurones', 'Hannibal', 'Los Tudor', 'Mad Men',
  'Andor', 'Falcon y el Soldado de Invierno', 'Jessica Jones', 'Agentes de SHIELD', 'Los informáticos', 'Frasier', 'Will y Grace', 'Acacias 38',
  'Gran Reserva', 'Los pacientes del doctor García', 'Señor, dame paciencia', 'Yu-Gi-Oh!', 'Érase una vez... el hombre', 'Periodistas',
  'Arde Madrid', 'Hierro', 'Patria', 'La novia gitana', 'Reina Roja', 'El cuerpo en llamas', 'Fringe', 'Euphoria', 'Orange Is the New Black',
  'La ruta', 'Motivos personales', 'Miraculous', 'Winx', 'Demon Slayer', 'My Hero Academia', 'La mesita del comedor', 'Parks and Recreation',
  'Ahsoka', 'The Punisher', 'Monk', 'Colombo', 'Xena', 'Melrose Place', 'Gym Tony', 'La víctima número 8', 'Polseres vermelles', 'Pulseras rojas',
  'Sin tetas no hay paraíso', 'Los mundos de Yupi', 'Los padrinos mágicos', 'American Dad', 'Black Sails', 'Sex Education', 'Suits', 'Fleabag',
  'Big Little Lies', 'This Is Us', 'Gossip Girl', 'Glee', 'Matrimonio con hijos', 'Walker, Texas Ranger', 'Homeland', 'House of Cards',
  'Unbreakable Kimmy Schmidt', 'Derry Girls', 'Engaños', 'The Night Agent', 'The Recruit', 'Supernatural', 'Hannah Montana', 'Lizzie McGuire',
  'iCarly', 'Sabrina, cosas de brujas', 'ThunderCats', 'The Flash', 'Arrow', 'Supergirl', 'Gotham', 'Lucifer', 'Skins', 'Misfits', 'Shameless',
  'The Vampire Diaries', 'True Blood', 'Teen Wolf', 'Archer', "Bob's Burgers", 'Girls', 'Entourage', 'Veep', '30 Rock', 'The IT Crowd',
  'Cowboy Bebop', 'Neon Genesis Evangelion', 'Inazuma Eleven', 'Arcane', 'Castlevania', 'The Sandman', 'Band of Brothers', "The Queen's Gambit",
  'The Haunting of Hill House', 'American Horror Story', 'Fear the Walking Dead', 'Invincible', 'Moon Knight', 'The Falcon and the Winter Soldier',
  'Ms. Marvel', 'The Book of Boba Fett', 'The Rings of Power', 'Severance', 'Ted Lasso', 'The Morning Show', 'The Newsroom', 'The Americans',
  'Six Feet Under', 'Sons of Anarchy', 'Ray Donovan', 'Person of Interest', 'Orphan Black', 'Killing Eve', 'Sharp Objects', 'Mare of Easttown',
  'Only Murders in the Building', 'The Marvelous Mrs. Maisel', 'Russian Doll', 'Love, Death & Robots', 'Sense8', 'Altered Carbon', 'Foundation',
  'Silo', 'For All Mankind', 'The Expanse', 'Battlestar Galactica', 'Firefly', 'Luther', 'Broadchurch', 'Line of Duty', 'Bodyguard',
  'Call the Midwife', 'The Pacific', 'The Night Of', 'When They See Us', 'Unbelievable', 'Maid', 'The Haunting of Bly Manor', 'Yellowjackets',
  'Gen V', 'Star Trek: Picard', 'Star Trek: Discovery', 'Disenchantment', 'Superstore', 'Arrested Development', 'Curb Your Enthusiasm',
  'American Gods', 'Preacher', 'Good Omens', 'His Dark Materials', 'Shadow and Bone', 'The Wheel of Time', 'Cyberpunk: Edgerunners',
  'Blue Eye Samurai', 'Yu Yu Hakusho', 'Deadwood', 'The Shield', 'Maniac', 'The Great', 'Generation Kill', 'Happy Valley', 'The Undoing',
  'The Flight Attendant',
  // Lugares menos conocidos
  'Auckland', 'Córcega', 'Capri', 'Mykonos', 'Santorini', 'Algarve', 'Cabo de Finisterre', 'Picos de Europa', 'Lago Ness', 'Fiordos noruegos',
  'Monte Fuji', 'Shanghái', 'Seúl', 'Bangkok', 'Ciudad del Cabo', 'Estambul', 'Edimburgo', 'Sicilia', 'Cataratas de Iguazú', 'Stonehenge',
  'Puente de Brooklyn', 'Wembley', 'Plaza Mayor de Madrid', 'Plaza de España', 'Catedral de Burgos', 'Guggenheim de Bilbao', 'Costa Brava',
  'Costa del Sol', 'Acueducto de Segovia', 'Puerta de Alcalá', 'Nueva Orleans', 'El Cairo', 'Gran Cañón', 'Cataratas del Niágara',
  'Canal de Panamá', 'Salamanca', 'Alicante', 'Cantabria', 'Aragón', 'Castilla y León', 'Extremadura', 'Navarra', 'Comunidad Valenciana',
  'Islas Baleares', 'Cataratas Victoria', 'Ártico', 'Boston', 'Toronto', 'Lima', 'Bogotá', 'Caracas', 'Florencia', 'Oporto', 'Budapest',
  'Jerusalén', 'Kioto', 'Agra', 'Katmandú', 'Bora Bora', 'Caribe', 'Vigo', 'A Coruña', 'Oviedo', 'Gijón', 'Pamplona', 'Cádiz', 'Las Palmas',
  'Copenhague', 'Estocolmo', 'Oslo', 'Helsinki', 'Montreal', 'São Paulo', 'Quito', 'La Paz', 'Montevideo', 'Punta Cana', 'Osaka', 'Hong Kong',
  'Bombay', 'Marrakech', 'Nairobi', 'Johannesburgo', 'Fontana di Trevi', 'Torre de Pisa', 'Empire State Building', 'Puente Golden Gate',
  'Pentágono', 'Monte Rushmore', 'Ciudad Prohibida', 'Ópera de Sídney', 'Burj Khalifa', 'Petra', 'Mar Muerto', 'Islas Galápagos',
  'Museo Británico', 'Disney World', 'Silicon Valley', 'Área 51', 'Córdoba', 'San Sebastián', 'Murcia', 'Asturias', 'Castilla-La Mancha',
  'La Rioja', 'Pirineos', 'Himalaya', 'Cancún', 'Santiago de Chile', 'Milán', 'Melbourne', 'Bali', 'Universal Studios', 'Patagonia', 'Delhi',
  'Museo del Louvre', 'Acrópolis', 'Wall Street', 'Downing Street', 'Buckingham Palace', 'Montecarlo', 'Cannes', 'Reikiavik', 'Zúrich',
  'Nápoles', 'Abu Dabi', 'Washington D. C.', 'Vancouver', 'Cerdeña', 'Creta', 'Tahití', 'Kilimanjaro', 'Uluru', 'Gran Barrera de Coral',
  'Mar Caribe', 'Lago Baikal', 'Lago Victoria', 'Río Támesis', 'Río Sena', 'Río Danubio', 'Chichén Itzá', 'Angkor Wat', 'Downtown', 'Broadway',
  'Valladolid', 'Cáceres', 'Santander', 'Burgos', 'Segovia', 'Cuenca', 'Ronda', 'Torremolinos', 'Sitges', 'Lloret de Mar', 'Rías Baixas',
  'Costa Blanca', 'Doñana', 'Tablas de Daimiel', 'Cabo de Gata', 'Ordesa', 'Aigüestortes', 'Monasterio de El Escorial', 'Ávila', 'Mérida',
  'Cartagena', 'Tarragona', 'Ampurias', 'Atapuerca', 'Altamira', 'Delta del Ebro', 'Mar Menor', 'Río Ebro', 'Río Tajo', 'Río Duero',
  'Río Guadalquivir', 'Río Guadiana', 'Estrecho de Gibraltar', 'Golfo de Vizcaya', 'Mar Cantábrico', 'Mar del Norte', 'Canal de la Mancha',
  'Mar Rojo', 'Golfo Pérsico', 'Mar de Japón', 'Mar de China', 'San Diego', 'Seattle', 'Filadelfia', 'Houston', 'Atlanta', 'Denver', 'Phoenix',
  'Portland', 'Honolulu', 'Quebec', 'Ottawa', 'Santo Domingo', 'Cartagena de Indias', 'Cusco', 'Ushuaia', 'Atacama', 'Isla de Pascua',
  'Serengeti', 'Zanzíbar', 'Canal de Suez', 'Tel Aviv', 'Amán', 'Doha', 'Riad', 'La Meca', 'Medina', 'Teherán', 'Bagdad', 'Damasco', 'Beirut',
  'Tíbet', 'Hanoi', 'Manila', 'Yakarta', 'Kuala Lumpur', 'Shenzhen', 'Busan', 'Nara', 'Fukushima', 'Wellington', 'Brisbane', 'Perth',
  'Tasmania', 'Christchurch', 'Queenstown', 'Gales', 'Bosnia', 'Varsovia', 'Cracovia', 'Bucarest', 'Zagreb', 'Liubliana', 'Belgrado', 'Sofía',
  'Tallin', 'Riga', 'Vilna', 'Nueva Delhi', 'Sídney', 'Hiroshima', 'Nagasaki', 'Pompeya', 'Partenón', 'Arco de Triunfo', 'Palacio de Versalles',
  'Catedral de Notre Dame', 'Alcázar de Sevilla', 'Puerta de Brandeburgo', 'Castillo de Neuschwanstein', 'Teatro Romano de Mérida',
  'Egipto', 'Aruba', 'Angola', 'Albania', 'Armenia', 'Azerbaiyán', 'Bangladés', 'Bahamas', 'Bosnia y Herzegovina', 'Bielorrusia', 'Bermudas',
  'Barbados', 'Bután', 'Camerún', 'Cabo Verde', 'Chipre', 'Estonia', 'Fiyi', 'Georgia', 'Ghana', 'Gibraltar', 'Groenlandia', 'Honduras',
  'Haití', 'Jordania', 'Kazajistán', 'Camboya', 'Kuwait', 'Líbano', 'Libia', 'Liechtenstein', 'Sri Lanka', 'Lituania', 'Luxemburgo',
  'Letonia', 'Maldivas', 'Mongolia', 'Mozambique', 'Malasia', 'Namibia', 'Nicaragua', 'Nepal', 'Omán', 'Palestina', 'Catar', 'Senegal',
  'Singapur', 'El Salvador', 'San Marino', 'Somalia', 'Serbia', 'Eslovaquia', 'Eslovenia', 'Taiwán', 'Tanzania', 'Uganda', 'Uzbekistán',
  'Yemen', 'Zimbabue', 'Zambia', 'Guinea', 'Montenegro', 'Moldavia', 'Sudán', 'Trinidad y Tobago', 'Costa de Marfil', 'Madagascar',
  'Islas Feroe', 'Islas Malvinas', 'Islas Caimán', 'Macao', 'Isla de Pascua', 'Tonga', 'Samoa', 'Laos', 'Mali', 'Níger', 'Chad', 'Togo',
  'Ruanda', 'Botsuana', 'Gambia', 'Malaui', 'Lesoto', 'Eritrea', 'Guatemala', 'Belice', 'Guyana', 'Surinam', 'Curazao',
  // Marcas menos conocidas
  'Fila', 'Oysho', 'Lowi', 'Yoigo', 'Under Armour', 'Asics', 'Columbia', 'Oakley', 'Armani', 'Dolce & Gabbana', 'Diesel', 'Uniqlo',
  'Sprinter', 'JD Sports', 'Foot Locker', 'Etsy', 'Expedia', 'Tripadvisor', 'Deliveroo', 'American Express', 'SEUR', 'MRW', 'FedEx', 'UPS',
  'EasyJet', 'Emirates', 'Qatar Airways', 'Lufthansa', 'Air France', 'British Airways', 'Damm', 'Voll-Damm', 'Amstel', 'Desperados',
  'Absolut', 'J&B', 'Martini', 'Campari', 'Häagen-Dazs', "Ben & Jerry's", 'Ferrero', 'Bounty', 'Activia', 'macOS', 'Amazon Echo',
  'Google Drive', 'Meta', 'AMD', 'NVIDIA', 'Ralph Lauren', 'Hermès París', 'Leroy Merlin', 'Cabify', 'Garnier', 'New Balance', 'Atari',
  'Versace', 'Hugo Boss', 'Universal', 'Nescafé', 'Casa Tarradellas', 'DC', 'Motorola', 'Hyundai', 'Kia', 'Nissan', 'Maybelline', 'Pantene',
  'Dove', 'Schweppes', 'Bacardi', 'Kodak', 'Nikon', 'GoPro', 'Dyson', 'Siemens', 'Steam', 'Wallapop', 'Pull&Bear', 'Kleenex',
  // Videojuegos menos conocidos
  'Space Invaders', 'Crash Bandicoot', 'World of Warcraft', 'League of Legends', 'Counter-Strike', 'Rocket League', 'Guitar Hero', 'Risk',
  'Scrabble', 'Simon', 'Tamagotchi', 'Street Fighter', 'Mortal Kombat', 'Fall Guys', 'Free Fire', 'Backgammon', 'Blackjack', 'Mus', 'Brisca',
  'Tute', 'Mikado', 'Tangram', 'Boggle', 'Mastermind', 'Carcassonne', 'Dixit', 'Pandemic',
  // Historia / Arte / Literatura / Ciencia: Difícil (conocidos por aficionados)
  'Galileo Galilei', 'Nikola Tesla', 'Thomas Edison', 'George Washington', 'Winston Churchill', 'Reina Victoria', 'Nefertiti',
  'Fernando el Católico', 'Isabel la Católica', 'Felipe II', 'Simón Bolívar', 'José de San Martín', 'Emiliano Zapata', 'Pancho Villa',
  'Fidel Castro', 'Mao Zedong', 'Nerón', 'Calígula', 'Ramsés II', 'Confucio', 'Sócrates', 'Platón', 'Nicolás Copérnico', 'Johannes Kepler',
  'Alexander Graham Bell', 'Louis Pasteur', 'Sigmund Freud', 'Vasco da Gama', 'Fernando de Magallanes', 'Hernán Cortés', 'Francisco Pizarro',
  'Rey Arturo', 'Ricardo Corazón de León', 'Luis XIV', 'María Antonieta', 'Catalina la Grande', 'Pedro el Grande', 'Mata Hari', 'Rasputín',
  'Ana Bolena', 'Enrique VIII', 'Juana la Loca', 'Carlos V', 'Alfonso X el Sabio', 'Don Pelayo', 'El Cid', 'Blas de Lezo', 'Agustina de Aragón',
  'Manuel Belgrano', 'Eva Perón', 'Rosa Parks', 'Valentina Tereshkova', 'Yuri Gagarin', 'Buzz Aldrin', 'Gengis Kan', 'Augusto',
  'Thomas Jefferson', 'Margaret Thatcher', 'Ronald Reagan', 'Vladimir Putin', 'Mijaíl Gorbachov', 'Benito Mussolini', 'Joseph Stalin',
  'Roald Amundsen', 'Guerra Fría', 'Caída del Imperio Romano', 'Imperio Azteca', 'Imperio Inca', 'Conquista de Granada', 'Reconquista',
  'Desembarco de Normandía', 'Batalla de Waterloo', 'Batalla de Trafalgar', 'Batalla de las Termópilas', 'Revolución Industrial',
  'Imperio Griego', 'Cruzadas', 'Tratado de Versalles', 'Batalla de Lepanto', 'Grecia Antigua', 'Imperio Bizantino', 'Imperio Otomano',
  'Imperio Mongol', 'Civilización Maya', 'Día D', 'Peste Negra', 'Esparta', 'Woodstock', 'Transición española', 'Isabel I de Inglaterra',
  'Charles de Gaulle', 'Atila', 'Alan Turing', 'Ada Lovelace', 'Beethoven', 'Mozart', 'Bach', 'Vivaldi', 'Chopin', 'Tchaikovsky', 'Verdi',
  'Wagner', 'John F. Kennedy', 'Juana de Arco', 'Marco Polo', 'Amelia Earhart', 'Marco Antonio', 'Salvador Allende', 'Constantino',
  'Carlomagno', 'Marco Aurelio', 'Aníbal Barca', 'Sun Tzu', 'Nostradamus', 'Florence Nightingale', 'Hipatia', 'Américo Vespucio',
  'Guillermo el Conquistador', 'Pitágoras', 'Rodin', 'Goethe', 'Miguel Hernández', 'Trajano', 'Felipe III', 'Felipe IV', 'Felipe V',
  'Carlos III', 'Fernando VII', 'Isabel II de España', 'Alfonso XIII', 'Adolfo Suárez', 'Felipe González', 'Lenin', 'Trotski', 'Juan Pablo II',
  'Ho Chi Minh', 'Akhenatón', 'Saladino', 'Suleimán el Magnífico', 'Shogun', 'Samurái', 'Templarios', 'Mahoma', 'Isaac Newton',
  'René Descartes', 'Voltaire', 'Rousseau', 'Robespierre', 'Bismarck', 'Garibaldi', 'Theodore Roosevelt', 'Franklin D. Roosevelt',
  'Richard Nixon', 'Bill Clinton', 'George W. Bush', 'Joe Biden', 'Pedro Sánchez', 'Mariano Rajoy', 'José María Aznar', 'Manuel Azaña',
  'Clara Campoamor', 'Dolores Ibárruri', 'Santiago Carrillo', 'Miguel Primo de Rivera', 'Elcano', 'Moctezuma', 'Atahualpa', 'Túpac Amaru',
  'Henry Ford', 'Hermanos Wright', 'Gutenberg', 'Martín Lutero', 'Séneca', 'Adriano', 'Rómulo', 'Remo', 'Cicerón', 'Leónidas', 'Pericles',
  'Boabdil', 'Jaime I el Conquistador', 'Pedro el Cruel', 'Juana la Beltraneja', 'Viriato', 'Averroes', 'Maimónides', 'Abderramán III',
  'Arquímedes', 'Hammurabi', 'Ciro el Grande',
  'Diego Velázquez', 'Francisco de Goya', 'Joan Miró', 'Andy Warhol', 'Banksy', 'Venus de Milo', 'Capilla Sixtina', 'El Guernica', 'Guernica',
  'El grito', 'Las Meninas', 'La última cena', 'El David', 'El pensador', 'El nacimiento de Venus', 'La persistencia de la memoria',
  'Rembrandt', 'Claude Monet', 'Édouard Manet', 'Paul Cézanne', 'Georges Seurat', 'Henri Matisse', 'Gustav Klimt', 'Edvard Munch',
  'Jackson Pollock', 'Roy Lichtenstein', 'Antoni Gaudí', 'Le Corbusier', 'Caravaggio', 'Botticelli', 'Vermeer', 'La maja desnuda',
  'La noche estrellada', 'Los girasoles', 'David de Miguel Ángel', 'La creación de Adán', 'Zurbarán', 'Diego Rivera',
  'El jardín de las delicias', 'La libertad guiando al pueblo', 'El beso', 'Impresión, sol naciente', 'El entierro del Conde de Orgaz',
  'La rendición de Breda', 'La Piedad', 'El Bosco', 'Rubens', 'Pablo Gargallo', 'Eduardo Chillida', 'El Greco', 'Rafael', 'Murillo', 'Sorolla',
  'La joven de la perla', 'Saturno devorando a su hijo', 'El caballero de la mano en el pecho', 'El beso de Rodin', 'La maja vestida',
  'David de Donatello', 'La escuela de Atenas', 'Las señoritas de Avignon', 'El hijo del hombre', 'American Gothic', 'Nenúfares',
  'La balsa de la Medusa', 'El 3 de mayo en Madrid', 'El coloso', 'La ronda de noche', 'El rapto de las sabinas', 'El arte de la guerra',
  'Antoni Tàpies', 'Tiziano', 'Paul Klee', 'Toulouse-Lautrec', 'Edward Hopper', 'Jean-Michel Basquiat', 'Damien Hirst', 'Jeff Koons',
  'Ai Weiwei', 'Casa Batlló', 'Casa Milà', 'Museo Guggenheim', 'Tate Modern', 'MOMA', 'Donatello', 'Antonio López', 'David Hockney',
  'Francis Bacon', "Georgia O'Keeffe", 'Yayoi Kusama', 'Keith Haring', 'Yoko Ono', 'Annie Leibovitz', 'Robert Capa', 'Man Ray',
  'Paul Gauguin', 'Pierre-Auguste Renoir', 'Edgar Degas', 'Wassily Kandinsky', 'Piet Mondrian', 'Marc Chagall', 'Mark Rothko',
  'Norman Rockwell', 'René Magritte', 'Max Ernst', 'Marcel Duchamp', 'Amedeo Modigliani', 'Frank Lloyd Wright', 'Zaha Hadid', 'Norman Foster',
  'Santiago Calatrava', 'Oscar Niemeyer', 'Frank Gehry',
  'Gabriel García Márquez', 'Agatha Christie', 'Don Juan', 'Federico García Lorca', 'Oscar Wilde', 'Charles Dickens', 'Julio Verne',
  'Dan Brown', 'Stephen King', 'Romeo', 'Julieta', 'Robinson Crusoe', 'Gulliver', 'Hercule Poirot', 'Miss Marple', 'Oliver Twist',
  'Victor Hugo', 'Edgar Allan Poe', 'Dante Alighieri', 'Jane Austen', 'George Orwell', 'Ernest Hemingway', 'Virginia Woolf', 'Herman Melville',
  'Ken Follett', 'Umberto Eco', 'Isabel Allende', 'Arturo Pérez-Reverte', 'Carlos Ruiz Zafón', 'Antonio Machado', 'Gustavo Adolfo Bécquer',
  'Benito Pérez Galdós', 'Emilia Pardo Bazán', 'Rosalía de Castro', 'Calderón de la Barca', 'El Lazarillo de Tormes', 'La Celestina',
  'La Ilíada', 'La isla del tesoro', 'Los tres mosqueteros', 'El nombre de la rosa', 'La sombra del viento', 'Don Juan Tenorio',
  'Fuenteovejuna', 'Platero y yo', 'Campos de Castilla', 'Fortunata y Jacinta', 'La Regenta', 'Nada', 'El camino',
  'La casa de los espíritus', 'Hamlet', 'Otelo', 'Moby Dick', 'Scrooge', 'Las mil y una noches', 'Huckleberry Finn',
  'El retrato de Dorian Gray', 'Rebelión en la granja', 'Los pilares de la Tierra', 'Spirou', 'Calvin y Hobbes', 'Sandman',
  'Camilo José Cela', 'Mario Vargas Llosa', 'Pablo Neruda', 'Jorge Luis Borges', 'Julio Cortázar', 'Gabriel Miró', 'Francisco de Quevedo',
  'Tirso de Molina', 'Aldous Huxley', 'J. R. R. Tolkien', 'C. S. Lewis', 'Arthur Conan Doyle', 'Alexandre Dumas', 'F. Scott Fitzgerald',
  'León Tolstói', 'Fiódor Dostoyevski', 'Antón Chéjov', 'Homero', 'Virgilio', 'Franz Kafka', 'Albert Camus', 'Robert Louis Stevenson',
  'Bram Stoker', 'Mary Shelley', 'Louisa May Alcott', 'Haruki Murakami', 'Paulo Coelho', 'Stieg Larsson', 'La casa de Bernarda Alba',
  'Romancero gitano', 'Cien años de soledad', 'El amor en los tiempos del cólera', 'David Copperfield', 'Orgullo y prejuicio', 'Jane Eyre',
  'Cumbres Borrascosas', 'Un mundo feliz', 'Veinte mil leguas de viaje submarino', 'Viaje al centro de la Tierra', 'El viejo y el mar',
  'El gran Gatsby', 'Crimen y castigo', 'Anna Karénina', 'Guerra y paz', 'Los miserables', 'El perfume', 'El código Da Vinci',
  '1984', 'La Odisea', 'La Divina Comedia', 'Miguel de Unamuno', 'Lope de Vega', 'Mark Twain', 'Macbeth', 'El conde de Montecristo',
  'El flautista de Hamelín', 'Tom Sawyer', 'Dr. Jekyll y Mr. Hyde', 'Manolito Gafotas', 'Madame Bovary', 'Fahrenheit 451',
  'Matar a un ruiseñor', 'El guardián entre el centeno', 'Bodas de sangre', 'Yerma', 'Luces de bohemia', 'Millennium', 'Misery',
  'El cementerio de animales', 'La vida de Pi', 'El médico', 'Fundación', 'Yo, robot', 'Javier Marías', 'Almudena Grandes', 'Rosa Montero',
  'Javier Cercas', 'Fernando Aramburu', 'Dolores Redondo', 'María Dueñas', 'Juan Gómez-Jurado', 'Santiago Posteguillo', 'Elvira Lindo',
  'Góngora', 'Leopoldo Alas Clarín', 'Miguel Delibes', 'Pío Baroja', 'Valle-Inclán', 'Juan Ramón Jiménez', 'Vicente Blasco Ibáñez',
  'Carmen Laforet', 'Ana María Matute', 'Stephenie Meyer', 'Suzanne Collins', 'John Grisham', 'Khaled Hosseini', 'Danielle Steel',
  'Nicholas Sparks', 'John le Carré', 'Isaac Asimov', 'Philip K. Dick', 'Arthur C. Clarke', 'Frank Herbert', 'Terry Pratchett', 'Neil Gaiman',
  'George R. R. Martin', 'Brandon Sanderson', 'Jules Verne', 'H. G. Wells', 'Charlotte Brontë', 'Emily Brontë', 'John Steinbeck',
  'J. D. Salinger', 'Harper Lee', 'Tennessee Williams', 'Truman Capote', 'Milan Kundera', 'Hermann Hesse', 'Jean-Paul Sartre',
  'Gustave Flaubert', 'Émile Zola', 'Marcel Proust', 'Ovidio', 'Sófocles',
  'Hefesto', 'Teseo', 'Perseo', 'Deméter', 'Hermes', 'Ares', 'Apolo', 'Artemisa', 'Hera', 'Dioniso', 'Prometeo', 'Orfeo', 'Narciso', 'Midas',
  'Ícaro', 'Pandora', 'Isis', 'Osiris', 'Anubis', 'Ra', 'Bastet', 'Horus', 'Seth', 'Thot', 'Quetzalcóatl', 'Hidra', 'Grifo', 'Esfinge',
  'Quimera', 'Cíclope', 'Gea', 'Cronos', 'Eros', 'Némesis', 'Freya', 'Valkiria', 'Fenrir', 'Heimdall', 'Balder', 'Lancelot', 'Ginebra',
  'Morgana', 'Beowulf', 'Amaterasu', 'Sun Wukong', 'Pachamama', 'Maui', 'Cthulhu', 'Yeti', 'Bigfoot', 'Kraken', 'Cerbero', 'Centauro',
  'Minotauro', 'Aquiles', 'Ulises', 'Atenea', 'Hades', 'Olimpo', 'Valhalla', 'Atlantis', 'Camelot', 'Excalibur', 'Odin', 'Gilgamesh',
  'Hidra de Lerna', 'Perséfone', 'Sirena',
  'Marie Curie', 'Charles Darwin', 'Alexander Fleming', 'Santiago Ramón y Cajal', 'Severo Ochoa', 'Jane Goodall', 'Carl Sagan',
  'Gregor Mendel', 'Mark Zuckerberg', 'Jeff Bezos', 'Steve Wozniak', 'Tim Berners-Lee', 'Elon Musk',
  'Hillary Clinton', 'Michelle Obama', 'Kamala Harris', 'Tony Blair', 'Boris Johnson', 'Emmanuel Macron', 'Angela Merkel', 'Volodímir Zelenski',
  'Silvio Berlusconi', 'Giorgia Meloni', 'Pablo Iglesias', 'Alberto Núñez Feijóo', 'Isabel Díaz Ayuso', 'Yolanda Díaz',
  'José Luis Rodríguez Zapatero', 'Santiago Abascal', 'Ada Colau', 'Manuela Carmena', 'Carles Puigdemont', 'Esperanza Aguirre', 'Karl Marx',
  'Friedrich Nietzsche', 'Dalai Lama', 'Teresa de Calcuta', 'Malcolm X', 'Juan Domingo Perón', 'Kim Jong-un', 'Benedicto XVI', 'Warren Buffett',
  'Amancio Ortega', 'Florentino Pérez', 'Juan Roig', 'Ana Botín', 'Jeffrey Bezos', 'Oprah Winfrey', 'Kylie Jenner', 'Paris Hilton',
  'Gordon Ramsay', 'Jamie Oliver', 'Ferran Adrià', 'Dabiz Muñoz', 'Jordi Cruz', 'Alberto Chicote', 'Risto Mejide', 'Ana Rosa Quintana',
  'Susanna Griso', 'Matías Prats', 'Iñaki Gabilondo', 'Wyoming', 'Dani Mateo', 'Carlos Latre', 'Florentino Fernández', 'Juan y Medio',
  'Joaquín Reyes', 'Ernesto Sevilla', 'Eva Hache', 'Martín Berasategui', 'José Andrés', 'Ramón García', 'Jesús Hermida', 'Manuel Fraga',
  'Jordi Pujol', 'Artur Mas', 'Oriol Junqueras', 'Rita Barberá', 'Cristina Cifuentes', 'Alfonso Guerra', 'George H. W. Bush',
  'Jacqueline Kennedy', 'Eleanor Roosevelt', 'David Cameron', 'Marine Le Pen', 'Olaf Scholz', 'Ursula von der Leyen', 'Boris Yeltsin',
  'Simone de Beauvoir', 'Hannah Arendt', 'Carl Jung', 'Yasser Arafat', 'Richard Branson', 'Jack Ma', 'Carlos Slim', 'Martha Stewart',
  'Papa Juan XXIII', 'Desmond Tutu', 'José Saramago', 'José Ortega y Gasset', 'Pablo Chiapella', 'Eduardo Gómez', 'Javier Cansado',
  'Raúl Cimas', 'Goyo Jiménez', 'José María Carrascal',
);

const VERY_HARD = S(
  'Tokelau', 'Niue', 'Isla Bouvet', 'Islas Heard y McDonald', 'Islas Cocos', 'Isla de Navidad', 'Isla Norfolk', 'Islas Pitcairn',
  'Territorios Australes Franceses', 'Territorio Británico del Océano Índico', 'Islas Georgia del Sur y Sandwich del Sur', 'Svalbard y Jan Mayen',
  'Islas menores alejadas de EE. UU.', 'Wallis y Futuna', 'San Pedro y Miquelón', 'San Bartolomé', 'Sint Maarten', 'San Martín', 'Mayotte',
  'Reunión', 'Guernesey', 'Jersey', 'Isla de Man', 'Islas Aland', 'Anguila', 'Montserrat', 'Islas Turcas y Caicos', 'Islas Vírgenes Británicas',
  'Islas Vírgenes de EE. UU.', 'Islas Marianas del Norte', 'Guam', 'Samoa Americana', 'Polinesia Francesa', 'Nueva Caledonia', 'Caribe neerlandés',
  'Curazao', 'Aruba', 'Bermudas', 'Islas Cook', 'Kiribati', 'Nauru', 'Tuvalu', 'Vanuatu', 'Palaos', 'Micronesia', 'Islas Marshall',
  'Islas Salomón', 'Tonga', 'Timor-Leste', 'Brunéi', 'Comoras', 'Seychelles', 'Mauricio', 'Santo Tomé y Príncipe', 'Guinea-Bisáu',
  'Guinea Ecuatorial', 'Yibuti', 'Eritrea', 'Esuatini', 'Lesoto', 'Burundi', 'Benín', 'Burkina Faso', 'República Centroafricana',
  'República Democrática del Congo', 'República del Congo', 'Gabón', 'Sudán del Sur', 'Sierra Leona', 'Liberia', 'Mauritania', 'Malaui',
  'Baréin', 'Kirguistán', 'Tayikistán', 'Turkmenistán', 'Kazajistán', 'Uzbekistán', 'Bután', 'Myanmar (Birmania)', 'Macedonia del Norte',
  'Dominica', 'Antigua y Barbuda', 'San Cristóbal y Nieves', 'Santa Lucía', 'San Vicente y las Granadinas', 'Granada', 'Guadalupe',
  'Martinica', 'Guayana Francesa', 'Santa Elena', 'Antártida', 'Sáhara Occidental', 'Gibraltar', 'Bangladés', 'Camboya', 'Laos', 'Nepal',
  'Mongolia', 'Azerbaiyán', 'Armenia', 'Georgia', 'Moldavia', 'Montenegro', 'Albania', 'Bosnia y Herzegovina', 'Bielorrusia', 'Lituania',
  'Letonia', 'Estonia', 'Eslovaquia', 'Eslovenia', 'Chad', 'Níger', 'Mali', 'Togo', 'Ruanda', 'Uganda', 'Zambia', 'Zimbabue', 'Botsuana',
  'Namibia', 'Mozambique', 'Angola', 'Camerún', 'Ghana', 'Gambia', 'Guinea', 'Costa de Marfil', 'Cabo Verde', 'Libia', 'Sudán', 'Somalia',
  'Yemen', 'Omán', 'Kuwait', 'Catar', 'Jordania', 'Líbano', 'Siria', 'Sri Lanka', 'Maldivas', 'Malasia', 'Taiwán', 'Tanzania', 'Kenia',
  'Etiopía', 'Nigeria', 'Senegal', 'Macao', 'Fiyi', 'Samoa', 'Barbados', 'Bahamas', 'Belice', 'Guyana', 'Surinam', 'Haití', 'Honduras',
  'Nicaragua', 'El Salvador', 'Trinidad y Tobago', 'Islas Feroe', 'Islas Malvinas', 'Islas Caimán', 'Groenlandia', 'Luxemburgo',
  'Liechtenstein', 'San Marino', 'Chipre', 'Malta', 'Serbia', 'Bulgaria', 'Uluru', 'Angkor Wat', 'Downtown', 'Ampurias', 'Atapuerca',
  'Tablas de Daimiel', 'Aigüestortes', 'Ordesa', 'Nara', 'Busan', 'Shenzhen', 'Queenstown', 'Christchurch', 'Liubliana', 'Vilna', 'Tallin',
  'Riga', 'Zagreb', 'Belgrado', 'Bucarest', 'Sofía', 'Cracovia', 'Kilimanjaro', 'Lago Baikal', 'Lago Victoria', 'Teatro Romano de Mérida',
  'Puerta de Brandeburgo', 'Castillo de Neuschwanstein', 'Cerdeña', 'Creta', 'Tahití', 'Abu Dabi', 'Reikiavik', 'Zúrich', 'Wellington',
  'Brisbane', 'Perth', 'Tasmania', 'Hanoi', 'Yakarta', 'Kuala Lumpur', 'Manila', 'Doha', 'Riad', 'Amán', 'Medina', 'Beirut', 'Damasco',
  'Bagdad', 'Teherán', 'Tel Aviv', 'Ushuaia', 'Atacama', 'Serengeti', 'Zanzíbar', 'Cusco', 'Cartagena de Indias', 'Santo Domingo', 'Ottawa',
  'Quebec', 'Honolulu', 'Portland', 'Denver', 'Atlanta', 'Houston', 'Phoenix', 'Filadelfia', 'Seattle', 'San Diego', 'Río Guadiana',
  'Mar de China', 'Mar de Japón', 'Golfo Pérsico', 'Mar del Norte', 'Golfo de Vizcaya', 'Delta del Ebro', 'Mar Menor', 'Cabo de Gata',
  'Sancho III', 'Sancho IV', 'Jaime II', 'Enrique IV de Castilla', 'Enrique II de Castilla', 'Juan II de Castilla', 'Alfonso VI', 'Alfonso VIII',
  'Cómodo', 'Agripina', 'Messalina', 'Tutmosis III', 'Darío I', 'Jerjes I', 'Filipo II de Macedonia', 'Temístocles', 'Nabucodonosor II',
  'Sargón de Acad', 'Asurbanipal', 'Justiniano', 'Teodora', 'Basilio II', 'Tycho Brahe', 'Spinoza', 'Montesquieu', 'Danton', 'Marat',
  'Mazzini', 'Ulysses S. Grant', 'Woodrow Wilson', 'Harry Truman', 'Dwight Eisenhower', 'Lyndon B. Johnson', 'Gerald Ford', 'Jimmy Carter',
  'Leopoldo Calvo-Sotelo', 'Federica Montseny', 'Juan Negrín', 'Buenaventura Durruti', 'Victoria Kent', 'Blas Infante', 'Sabino Arana',
  'Andrés de Urdaneta', 'George Stephenson', 'James Watt', 'Erasmo de Rotterdam', 'Tomás Moro', 'Calvino', 'Carlos II', 'Carlos IV',
  'Vercingétorix', 'Boudica', 'Mehmed II', 'Murasaki Shikibu', 'Tokugawa Ieyasu', 'Ramsés III', 'Miyamoto Musashi', 'Leonor de Aquitania',
  'Hatshepsut', 'Guillermo el Conquistador', 'Marco Antonio',
  'Brancusi', 'Egon Schiele', 'Anish Kapoor', 'Louise Bourgeois', 'Campbell\'s Soup Cans', 'Marilyn Diptych', 'Nighthawks',
  'El almuerzo de los remeros', 'Bailarina de Degas', 'Maruja Mallo', 'Remedios Varo', 'José Clemente Orozco', 'Lucian Freud',
  'Marina Abramović', 'Olafur Eliasson', 'JR', 'Cindy Sherman', 'Steve McCurry', 'Henri Cartier-Bresson', 'Diane Arbus', 'Richard Avedon',
  'Helmut Newton', 'Vivian Maier', 'Dorothea Lange', 'Camille Pissarro', 'Henri de Toulouse-Lautrec', 'Kazimir Malévich', 'Giorgio de Chirico',
  'Mies van der Rohe', 'Renzo Piano', 'Richard Rogers', 'Georges Seurat', 'Roy Lichtenstein', 'Pablo Gargallo',
  'Rayuela', 'Ficciones', 'Pedro Páramo', 'Como agua para chocolate', 'Notre Dame de París', 'Los hermanos Karamázov', 'Las uvas de la ira',
  'Los pazos de Ulloa', 'Tiempo de silencio', 'Soldados de Salamina', 'La verdad sobre el caso Harry Quebert', 'Ensayo sobre la ceguera',
  'Seda', 'Cometas en el cielo', 'Neuromante', 'Laura Esquivel', 'Eva García Sáenz de Urturi', 'Mercè Rodoreda', 'Josep Pla', 'Salvador Espriu',
  'Ursula K. Le Guin', 'Stendhal', 'Eurípides', 'Esquilo', 'Gabriel Miró', 'Tirso de Molina', 'Louisa May Alcott', 'Antón Chéjov',
  'Enkidu', 'Tiamat', 'Ishtar', 'Marduk', 'Anansi', 'Susanoo', 'Tsukuyomi', 'Chaac', 'Kukulkán', 'Manco Cápac', 'Viracocha', 'Inti', 'Tlaloc',
  'Huitzilopochtli', 'Jörmungandr', 'Circe', 'Eurídice', 'Penélope', 'Rea', 'Hestia',
  'Hedy Lamarr', 'Katherine Johnson', 'Richard Feynman', 'Rosalind Franklin', 'Dmitri Mendeléyev', 'Niels Bohr', 'Erwin Schrödinger',
  'Werner Heisenberg', 'James Clerk Maxwell', 'Michael Faraday', 'Robert Hooke', 'Antoine Lavoisier',
  'Margarita Nelken', 'María Zambrano', 'Erich Fromm', 'Desmond Morris', 'Golda Meir', 'Ben Gurion', 'Ariel Sharon', 'Sergio Mattarella',
  'Joaquín Almunia',
);

const MEDIUM = S(
  'Stephen Hawking', 'Leonardo da Vinci', 'Miguel Ángel', 'Frida Kahlo', 'Vincent van Gogh', 'Salvador Dalí', 'Pablo Picasso',
  'La Gioconda', 'Miguel de Cervantes', 'William Shakespeare', 'J. K. Rowling', 'Napoleón', 'Julio César', 'Cristóbal Colón',
  'Mahatma Gandhi', 'Nelson Mandela', 'Adolf Hitler', 'Cleopatra', 'Tutankamón', 'Che Guevara', 'Abraham Lincoln', 'Reina Isabel II',
  'Martin Luther King', 'Neil Armstrong', 'Alejandro Magno', 'Walt Disney', 'Steve Jobs', 'Bill Gates', 'Donald Trump', 'Barack Obama',
  'Francisco Franco', 'Jesús', 'Buda', 'Moisés', 'Papa Francisco', 'Kim Kardashian', 'Albert Einstein', 'Isaac Newton', 'Elon Musk',
  'Zeus', 'Hércules', 'Medusa', 'Cupido', 'Pegaso', 'Poseidón', 'Afrodita', 'Merlín', 'Fénix', 'Momia', 'Hombre lobo',
  'Segunda Guerra Mundial', 'Primera Guerra Mundial', 'Revolución Francesa', 'Llegada a la Luna', 'Guerra Civil Española', 'Imperio Romano',
  'Antiguo Egipto', 'Edad Media', 'Renacimiento', 'Descubrimiento de América', 'Hundimiento del Titanic', 'Caída del Muro de Berlín',
  'Don Quijote', 'Sherlock Holmes', 'Romeo y Julieta', 'Don Quijote de la Mancha', 'El Principito', 'Harry Potter',
  'Hillary Clinton', 'Michelle Obama', 'Kamala Harris', 'Boris Johnson', 'Emmanuel Macron', 'Angela Merkel', 'Volodímir Zelenski',
  'Pablo Iglesias', 'Alberto Núñez Feijóo', 'Isabel Díaz Ayuso', 'Yolanda Díaz', 'José Luis Rodríguez Zapatero', 'Santiago Abascal',
  'Carles Puigdemont', 'Dalai Lama', 'Teresa de Calcuta', 'Amancio Ortega', 'Florentino Pérez', 'Oprah Winfrey', 'Kylie Jenner',
  'Paris Hilton', 'Gordon Ramsay', 'Alberto Chicote', 'Risto Mejide', 'Ana Rosa Quintana', 'Matías Prats', 'Wyoming', 'Dani Mateo',
  'Carlos Latre', 'Florentino Fernández', 'Juan y Medio', 'Joaquín Reyes', 'Ernesto Sevilla', 'Eva Hache', 'Jordi Cruz', 'Dabiz Muñoz',
  'Ferran Adrià', 'Pedro Sánchez', 'Mariano Rajoy', 'José María Aznar', 'Winston Churchill', 'George Washington', 'Galileo Galilei',
  'Nikola Tesla', 'Thomas Edison', 'Sigmund Freud', 'Marie Curie', 'Charles Darwin', 'Reina Victoria', 'Isabel la Católica', 'Felipe II',
  'Fidel Castro', 'Vladimir Putin', 'Margaret Thatcher', 'Benito Mussolini', 'Joseph Stalin', 'John F. Kennedy', 'Juana de Arco',
  'Marco Polo', 'Beethoven', 'Mozart', 'Bach', 'El Cid', 'Enrique VIII', 'Luis XIV', 'María Antonieta', 'Ramsés II', 'Nerón', 'Platón',
  'Sócrates', 'Rey Arturo', 'Hernán Cortés', 'Simón Bolívar', 'Eva Perón', 'Rosa Parks', 'Yuri Gagarin', 'Guerra Fría',
  'Batalla de Waterloo', 'Diego Velázquez', 'Francisco de Goya', 'Joan Miró', 'Andy Warhol', 'Banksy', 'Venus de Milo', 'Capilla Sixtina',
  'Guernica', 'El grito', 'Las Meninas', 'La última cena', 'El pensador', 'Claude Monet', 'Antoni Gaudí', 'La noche estrellada',
  'Los girasoles', 'David de Miguel Ángel', 'La creación de Adán', 'Gabriel García Márquez', 'Agatha Christie', 'Federico García Lorca',
  'Oscar Wilde', 'Charles Dickens', 'Julio Verne', 'Dan Brown', 'Stephen King', 'Edgar Allan Poe', 'Victor Hugo', 'Jane Austen',
  'George Orwell', 'Hercule Poirot', 'Hamlet', 'Moby Dick', 'Scrooge', 'Las mil y una noches', 'J. R. R. Tolkien', 'Pablo Neruda',
  'Mario Vargas Llosa', 'Cien años de soledad', 'Los tres mosqueteros', 'La isla del tesoro', '1984', 'Orgullo y prejuicio', 'Los miserables',
  'El código Da Vinci', 'Drácula', 'Frankenstein', 'Ulises', 'Aquiles', 'Minotauro', 'Atenea', 'Hades', 'Olimpo', 'Kraken', 'Cerbero',
  'Centauro', 'Ícaro', 'Pandora', 'Anubis', 'Yeti', 'Bigfoot', 'Odin', 'Excalibur', 'Camelot', 'Lancelot', 'Hermes', 'Apolo', 'Ares',
  'Artemisa', 'Hera', 'Prometeo', 'Narciso', 'Midas', 'Orfeo', 'Esfinge', 'Grifo', 'Hidra', 'Cíclope', 'Valkiria', 'Isis', 'Osiris', 'Ra',
  'Quetzalcóatl', 'Sirena', 'Elfo', 'Ogro', 'Troll', 'Duende', 'Gnomo', 'Mago', 'Hada', 'Bruja', 'Vampiro', 'Zombi', 'Dragón', 'Unicornio',
  'Rembrandt', 'Caravaggio', 'Botticelli', 'Vermeer', 'Paul Cézanne', 'Henri Matisse', 'Gustav Klimt', 'Edvard Munch', 'Jackson Pollock',
  'El Greco', 'Sorolla', 'Murillo', 'El Bosco', 'Rubens', 'Rafael', 'Donatello', 'Tiziano', 'La joven de la perla', 'La Piedad', 'El beso',
  'Homero', 'La Odisea', 'La Ilíada', 'La Divina Comedia', 'Macbeth', 'Otelo', 'Tom Sawyer', 'Huckleberry Finn', 'El Lazarillo de Tormes',
  'Robinson Crusoe', 'Gulliver', 'Oliver Twist', 'Miss Marple', 'Don Juan', 'Don Juan Tenorio', 'Romeo', 'Julieta', 'Ken Follett',
  'Isabel Allende', 'Arturo Pérez-Reverte', 'Carlos Ruiz Zafón', 'La sombra del viento', 'Los pilares de la Tierra', 'El nombre de la rosa',
  'Umberto Eco', 'Ernest Hemingway', 'Franz Kafka', 'Paulo Coelho', 'Haruki Murakami', 'Jorge Luis Borges', 'Julio Cortázar',
  'Camilo José Cela', 'Miguel Delibes', 'Antonio Machado', 'Gustavo Adolfo Bécquer', 'Benito Pérez Galdós', 'Rosalía de Castro',
  'Lope de Vega', 'Francisco de Quevedo', 'Miguel de Unamuno', 'Mark Twain', 'Alexandre Dumas', 'Arthur Conan Doyle', 'Bram Stoker',
  'Mary Shelley', 'Jules Verne', 'León Tolstói', 'Fiódor Dostoyevski', 'F. Scott Fitzgerald', 'El gran Gatsby', 'Guerra y paz',
  'Anna Karénina', 'Crimen y castigo', 'Jane Eyre', 'Cumbres Borrascosas', 'Un mundo feliz', 'El viejo y el mar', 'Fahrenheit 451',
  'Matar a un ruiseñor', 'Rebelión en la granja', 'El perfume', 'Millennium', 'Misery', 'La casa de Bernarda Alba', 'Bodas de sangre',
  'Platero y yo', 'La Regenta', 'Fortunata y Jacinta', 'Fuenteovejuna', 'La Celestina', 'La vida de Pi', 'Los hermanos Karamázov',
  'Alan Turing', 'Ada Lovelace', 'Alexander Fleming', 'Santiago Ramón y Cajal', 'Louis Pasteur', 'Alexander Graham Bell',
  'Nicolás Copérnico', 'Johannes Kepler', 'Arquímedes', 'Pitágoras', 'Confucio', 'Mark Zuckerberg', 'Jeff Bezos', 'Jeffrey Bezos',
  'Warren Buffett', 'Richard Branson', 'Jack Ma', 'Carlos Slim', 'Juan Roig', 'Ana Botín', 'Kim Jong-un', 'Silvio Berlusconi',
  'Giorgia Meloni', 'Tony Blair', 'Barack Obama', 'Donald Trump', 'Joe Biden', 'Bill Clinton', 'George W. Bush', 'Richard Nixon',
  'Franklin D. Roosevelt', 'Theodore Roosevelt', 'Thomas Jefferson', 'Ronald Reagan', 'Mijaíl Gorbachov', 'Lenin', 'Mao Zedong',
  'Ho Chi Minh', 'Charles de Gaulle', 'Juan Pablo II', 'Benedicto XVI', 'Mahoma', 'Carlomagno', 'Atila', 'Gengis Kan', 'Marco Aurelio',
  'Constantino', 'Nefertiti', 'Akhenatón', 'Hatshepsut', 'Isabel I de Inglaterra', 'Ana Bolena', 'Catalina la Grande', 'Pedro el Grande',
  'Rasputín', 'Mata Hari', 'Amelia Earhart', 'Florence Nightingale', 'Nostradamus', 'Sun Tzu', 'Fernando el Católico', 'Carlos V',
  'Felipe V', 'Carlos III', 'Fernando VII', 'Isabel II de España', 'Alfonso XIII', 'Juana la Loca', 'Alfonso X el Sabio', 'Don Pelayo',
  'Boabdil', 'Blas de Lezo', 'Agustina de Aragón', 'Adolfo Suárez', 'Felipe González', 'Manuel Azaña', 'Clara Campoamor',
  'Dolores Ibárruri', 'Santiago Carrillo', 'Miguel Primo de Rivera', 'Manuel Fraga', 'Jordi Pujol', 'Artur Mas', 'Oriol Junqueras',
  'Esperanza Aguirre', 'Rita Barberá', 'Ada Colau', 'Manuela Carmena', 'Emiliano Zapata', 'Pancho Villa', 'José de San Martín',
  'Salvador Allende', 'Juan Domingo Perón', 'Moctezuma', 'Atahualpa', 'Fernando de Magallanes', 'Vasco da Gama', 'Francisco Pizarro',
  'Américo Vespucio', 'Elcano', 'Neil Armstrong', 'Buzz Aldrin', 'Valentina Tereshkova', 'Henry Ford', 'Hermanos Wright', 'Gutenberg',
  'Martín Lutero', 'Voltaire', 'Rousseau', 'Robespierre', 'Bismarck', 'Garibaldi', 'Séneca', 'Cicerón', 'Leónidas', 'Espartaco',
  'Imperio Azteca', 'Imperio Inca', 'Imperio Otomano', 'Imperio Bizantino', 'Imperio Mongol', 'Civilización Maya', 'Grecia Antigua',
  'Esparta', 'Reconquista', 'Conquista de Granada', 'Cruzadas', 'Peste Negra', 'Revolución Industrial', 'Día D', 'Desembarco de Normandía',
  'Batalla de Trafalgar', 'Batalla de Lepanto', 'Batalla de las Termópilas', 'Woodstock', 'Transición española', 'Caída del Imperio Romano',
  'Tratado de Versalles', 'Imperio Griego', 'Malcolm X', 'Desmond Tutu', 'Yasser Arafat', 'José Saramago', 'Simone de Beauvoir',
  'Hannah Arendt', 'Carl Jung', 'José Ortega y Gasset', 'Martín Berasategui', 'José Andrés', 'Iñaki Gabilondo', 'Susanna Griso',
  'Ramón García', 'Jesús Hermida', 'Pablo Chiapella', 'Eduardo Gómez', 'Javier Cansado', 'Raúl Cimas', 'Goyo Jiménez', 'Jamie Oliver',
  'Martha Stewart', 'Trancas y Barrancas',
);

// Categorías en las que un adulto medio conoce la mayoría de entradas: base Media.
const BASE_MEDIUM = new Set(['Deportes', 'Música', 'Cine y TV', 'Personajes', 'Películas', 'Series', 'Lugares', 'Marcas', 'Videojuegos', 'Naturaleza']);

// Series conocidas por el gran público (la base de Series es Difícil: los títulos cuestan más de describir).
const MEDIUM_SERIES = S(
  'Doctor Who', 'MacGyver', 'El Equipo A', 'Los vigilantes de la playa', 'Alf', 'Malcolm', 'Mujeres desesperadas', 'Sexo en Nueva York',
  'Anatomía de Grey', 'House', 'Dexter', 'Peaky Blinders', 'The Witcher', 'Narcos', 'Los Bridgerton', 'The Mandalorian', 'The Boys',
  'Perdidos', 'Prison Break', 'The Office', 'Black Mirror', 'The Crown', 'Vikingos', 'The Last of Us', 'Los Soprano', 'Better Call Saul',
  'Sherlock', 'Downton Abbey', 'Chernobyl', 'Cobra Kai', 'Loki', 'WandaVision', 'Daredevil', 'Dos hombres y medio', 'Brooklyn Nine-Nine',
  'Ana y los 7', 'Amar en tiempos revueltos', 'El secreto de Puente Viejo', 'La catedral del mar', 'El tiempo entre costuras', 'South Park',
  'Futurama', 'Los Supersónicos', 'Inspector Gadget', 'He-Man y los Masters del Universo', 'Digimon', 'One Piece', 'Ataque a los titanes',
  'Mazinger Z', 'Marco', 'La abeja Maya', 'Al salir de clase', 'Gran Hotel', 'Camera Café', 'Hospital Central', '24', 'The Wire', 'CSI',
  'NCIS', 'Buffy, cazavampiros', 'Embrujadas', 'Twin Peaks', 'Ally McBeal', 'Salvados por la campana', 'Cosas de casa', 'El coche fantástico',
  'Xena: la princesa guerrera', 'Smallville', 'Héroes', 'Ted Lasso', "The Handmaid's Tale", 'Mr. Robot', 'Westworld', 'House of the Dragon',
  'La Casa del Dragón', 'Lupin', 'The White Lotus', 'Bleach', 'Death Note', 'Detective Conan', 'Rugrats', 'Steven Universe', 'BoJack Horseman',
  'Los misterios de Laura', 'Mentes criminales', 'Bones', 'Sensación de vivir', 'You', 'Fargo', 'True Detective', '7 vidas', 'Seinfeld',
  'Merlí', 'El Ministerio del Tiempo', 'Un paso adelante', 'Compañeros', 'Los Protegidos', 'Expediente X', 'Dallas', 'Dinastía', 'Cheers',
  'Embrujada', 'Los Roper', 'Scrubs', 'Hijos de la Anarquía', 'Dark', 'Ozark', 'Succession', 'The Bear', 'Yellowstone', 'The Good Doctor',
  '30 monedas', 'Antidisturbios', 'Hannibal', 'Los Tudor', 'Mad Men', 'Andor', 'Frasier', 'Will y Grace', 'Acacias 38', 'Yu-Gi-Oh!',
  'Érase una vez... el hombre', 'Periodistas', 'Arde Madrid', 'Hierro', 'Patria', 'Euphoria', 'Orange Is the New Black', 'Miraculous', 'Winx',
  'Demon Slayer', 'My Hero Academia', 'Parks and Recreation', 'Ahsoka', 'The Punisher', 'Monk', 'Colombo', 'Melrose Place', 'Gym Tony',
  'Pulseras rojas', 'Sin tetas no hay paraíso', 'Los mundos de Yupi', 'Los padrinos mágicos', 'American Dad', 'Sex Education', 'Suits',
  'Fleabag', 'Big Little Lies', 'This Is Us', 'Gossip Girl', 'Glee', 'Matrimonio con hijos', 'Walker, Texas Ranger', 'Homeland',
  'House of Cards', 'Supernatural', 'Hannah Montana', 'Lizzie McGuire', 'iCarly', 'Sabrina, cosas de brujas', 'ThunderCats', 'The Flash',
  'Arrow', 'Supergirl', 'Gotham', 'Lucifer', 'Skins', 'Shameless', 'The Vampire Diaries', 'True Blood', 'Teen Wolf', 'Archer', "Bob's Burgers",
  'The IT Crowd', 'Cowboy Bebop', 'Neon Genesis Evangelion', 'Inazuma Eleven', 'Arcane', 'Castlevania', 'The Sandman', 'Band of Brothers',
  "The Queen's Gambit", 'American Horror Story', 'Fear the Walking Dead', 'Invincible', 'Moon Knight', 'Ms. Marvel', 'The Rings of Power',
  'Severance', 'Sons of Anarchy', 'Killing Eve', 'Only Murders in the Building', 'Foundation', 'The Expanse', 'Luther', 'Bodyguard',
  'Star Trek: Picard', 'Star Trek: Discovery', 'Arrested Development', 'Good Omens', 'Kim Possible', 'Águila Roja', 'Policías', 'La peste',
  'Obi-Wan Kenobi', 'Entrevías', 'Veneno', 'Fariña', 'Estoy vivo', 'El pueblo', "D'Artacán y los tres mosqueperros", 'Urgencias', 'Mindhunter',
  'The Umbrella Academy', 'Stargate SG-1', 'Hércules: sus viajes legendarios', 'Spartacus', 'Boardwalk Empire', 'The Good Place', 'Community',
  'Cristo y Rey', 'Alice in Borderland', 'Fringe', 'La ruta', 'Reina Roja', 'Big Mouth', 'The Falcon and the Winter Soldier',
  'The Book of Boba Fett', 'The Haunting of Hill House', 'Bodyguard', 'Broadchurch', 'Line of Duty', 'Maid', 'Squid Game',
);

// Películas, música, cine y personajes de nicho (la base de esas categorías es Media).
const NICHE = S(
  // Películas
  'Viridiana', 'Master and Commander', 'Stardust', 'El emperador y sus locuras', 'Black Hawk derribado', 'El milagro de P. Tinto', 'Plácido',
  'El verdugo', 'Your Name', 'Zodiac', 'Eragon', 'Desayuno con diamantes', 'Rango', 'Megamind', 'Monstruos contra alienígenas',
  'El buen dinosaurio', 'Los Mitchell contra las máquinas', 'Oliver y su pandilla', 'El gigante de hierro', 'La princesa Mononoke',
  'Atlantis: El imperio perdido', 'El planeta del tesoro', 'La huérfana', 'Tron', 'Fama', 'Flashdance', 'El apartamento', 'Doctor Zhivago',
  'Pagafantas', 'Secretos del corazón', 'El bola', 'Villaviciosa de al lado', 'Kiki, el amor se hace', 'El reino', 'Mientras dure la guerra',
  'Rocketman', 'Black Adam', 'Shazam!', 'Creed', 'It Follows', 'Hereditary', 'Midsommar', 'Sinister', 'District 9', 'Elysium', 'Pacific Rim',
  'Deep Impact', 'Stargate', 'Tenet', 'Nomadland', 'Moonlight', 'Spotlight', 'Babel', 'Crash', 'Birdman', 'Blade Runner 2049',
  'A.I. Inteligencia Artificial', 'Minority Report', 'Arthur Christmas', 'Hop', 'Aviones', 'Klaus', "Five Nights at Freddy's",
  'Los lunes al sol', 'Mentiroso compulsivo', 'El efecto mariposa', 'Detective Pikachu', 'La novia cadáver', 'Por un puñado de dólares',
  'Érase una vez en América', 'Érase una vez en el Oeste', 'Drácula de Bram Stoker', 'El corredor del laberinto', 'Los padres de ella',
  'Piratas', 'Percy Jackson', 'Conan', 'Catwoman', 'Cinema Paradiso', 'Stuart Little', 'American Psycho', 'Full Metal Jacket', 'Con Air',
  'Face/Off', 'Akira', 'Sospechosos habituales', 'El curioso caso de Benjamin Button', 'Relatos salvajes', 'El secreto de sus ojos',
  'Divergente', 'La cosa', 'Wallace y Gromit', 'Ready Player One', 'Contact', 'La llegada', 'El patriota', 'Los intocables de Eliot Ness',
  'Espartaco', 'El gran dictador', 'Tiempos modernos', 'Sin City', 'Watchmen', 'Billy Elliot', 'Full Monty', 'Platoon', 'La ventana indiscreta',
  'Heat', 'Memento', 'El gran Lebowski', 'El príncipe de Zamunda', 'Willow', 'Cuenta conmigo', 'Footloose', 'Spirit: El corcel indomable',
  'El príncipe de Egipto', 'Coraline', 'El castillo ambulante', 'Ponyo', 'La lengua de las mariposas', 'Los santos inocentes', 'Primos',
  'Spanish Movie', 'Hable con ella', '¿Qué he hecho yo para merecer esto?', 'Cantando bajo la lluvia', 'West Side Story', 'Logan',
  'Encuentros en la tercera fase', '2001: Una odisea del espacio', 'Celda 211', 'La escopeta nacional', 'Amanece, que no es poco',
  'El quinto elemento', 'El último samurái', 'Chicago', 'Million Dollar Baby', 'Kingsman', 'Erin Brockovich', 'Thelma y Louise', 'Big Fish',
  'Chicken Run', 'La terminal', 'Apolo 13', 'La vida de Brian', 'Slumdog Millionaire', 'El discurso del rey', 'Amélie', 'Big',
  'Ángeles y demonios', 'Un lugar tranquilo', 'Déjame salir', 'La bruja', 'El proyecto de la bruja de Blair', 'Réquiem por un sueño',
  'American History X', 'Todo a la vez en todas partes', 'Monsters University', 'Ralph rompe Internet', '1917', 'Speed', 'Insidious',
  'Expediente Warren', 'Destino final', 'La profecía', 'Reservoir Dogs', 'Lawrence de Arabia', 'Truman', 'Dolor y gloria', 'Dunkerque',
  'Dirty Harry', 'Arma letal', 'Paddington', 'La guerra de los mundos', 'Argo', '12 años de esclavitud', 'Cisne negro', 'The Ring',
  'Asterix y Obelix', 'Mad Max', 'V de Vendetta', 'Uno de los nuestros', 'Casino', 'Apocalypse Now', 'Vértigo', 'Poltergeist',
  'Robin Hood: príncipe de los ladrones', 'Star Trek', 'Noche en el museo',
  // Música
  'Manic Street Preachers', 'Moloko', 'Skunk Anansie', 'Garbage', 'Texas', 'The Corrs', 'The Script', 'Travis', 'Keane', 'Snow Patrol',
  'The Kooks', 'The Libertines', 'The Hives', 'Placebo', 'Dio', 'Manowar', 'Nightwish', 'Whitesnake', 'Def Leppard', 'Tears for Fears',
  'Portishead', 'Massive Attack', 'Chemical Brothers', 'The Prodigy', 'Fatboy Slim', 'Moby', 'Alice in Chains', 'Soundgarden',
  'The Smashing Pumpkins', 'Panic! at the Disco', 'The Cardigans', 'Christine and the Queens', 'Angèle', 'Bette Midler', 'Liza Minnelli',
  'Carly Simon', 'Fergie', 'Kesha', 'Halsey', 'Lizzo', 'Megan Thee Stallion', 'Mary J. Blige', 'Viva Suecia', 'Pignoise', 'La Casa Azul',
  'Los Ronaldos', 'Izal', 'Molotov', 'Rubén Blades', 'Yandel', 'Massiel', 'Billie Joe Armstrong', 'Chappell Roan', 'Akon', 'Kortatu',
  'David Otero', 'S Club 7', 'Sugababes', 'All Saints', 'Girls Aloud', '5 Seconds of Summer', 'Kansas', 'Foreigner', 'Modern Talking',
  'The Temptations', 'The Supremes', 'Earth, Wind & Fire', 'John Mayer', 'Jason Mraz', 'Paolo Nutini', 'Amy Macdonald', 'Sophie Ellis-Bextor',
  'The Vamps', 'Bastille', 'Boyzone', 'Blue', 'Journey', 'Survivor', 'Toto', 'Seal', 'Motörhead', 'Judas Priest', 'OneRepublic', 'Café Tacvba',
  'Los Rodríguez', 'Soda Stereo', 'Alaska y Dinarama', 'Jason Derulo', 'Jennifer Hudson', 'Dr. Dre', 'Kendrick Lamar', 'Notorious B.I.G.',
  'Presuntos Implicados', 'La Unión', 'Seguridad Social', 'M-Clan', 'Nacha Pop', 'Duncan Dhu', 'Siniestro Total', 'Dover', 'La Quinta Estación',
  'Twenty One Pilots', 'Keith Richards', 'Bonnie Tyler', 'Nathy Peluso', 'Duki', 'Rels B', 'Rozalén', 'Bebe', 'Soraya Arnelas', 'Vanesa Martín',
  'India Martínez', 'Pastora Soler', 'Fito Cabrales', 'Dani Fernández', 'Antonio Flores', 'Zahara', 'Bunbury', 'Marvin Gaye', 'Shania Twain',
  'Los Secretos', 'Ringo Starr', 'Barbra Streisand', 'Dean Martin', 'Nat King Cole', 'Tom Jones', 'Lionel Richie', 'Gorillaz', 'NSYNC', 'RBD',
  'Rage Against the Machine', 'The Offspring', 'Blink-182', 'Franz Ferdinand', 'The White Stripes', 'The Strokes', 'Kings of Leon', 'Paramore',
  'Sum 41', 'Fall Out Boy', 'My Chemical Romance', 'System of a Down', 'Slipknot', 'Korn', 'Limp Bizkit', 'Alice Cooper', 'Måneskin', 'Aqua',
  'Vengaboys', 'Ace of Base', 'Dido', 'Westlife', 'Take That', 'Little Mix', 'Fifth Harmony', 'The Pussycat Dolls', 'Cardi B', 'Travis Scott',
  'Post Malone', 'Doja Cat', 'Judy Garland', 'Dolly Parton', 'Alanis Morissette', 'The Jackson 5', 'Rammstein', 'Marilyn Manson',
  'Lenny Kravitz', 'James Blunt', 'Norah Jones', 'Celia Cruz', 'Love of Lesbian', 'La Polla Records', 'Deep Purple', 'Fleetwood Mac',
  'The Who', 'Blur', 'Jamiroquai', 'Simply Red', 'Pet Shop Boys', 'Ska-P', 'Jarabe de Palo', 'Pereza', 'Vetusta Morla', 'El Último de la Fila',
  'Celtas Cortos', 'Morad', 'Don Omar', 'Carlos Vives', 'Enya', 'Cyndi Lauper', 'Diana Ross', 'Janis Joplin', 'James Brown', 'Wham!', 'A-ha',
  'Keith Richards', 'Camila Cabello', 'Evanescence', 'Pearl Jam', 'Jonas Brothers', 'Evanescence', 'Rick Astley', 'Muse', 'Arctic Monkeys',
  'Radiohead', 'Duran Duran', 'Foo Fighters', 'Iron Maiden', 'The Doors', 'Kiss', 'Daft Punk', 'R.E.M.', 'Dire Straits', 'Eurythmics',
  'Boney M.', 'Village People', 'Roxette', 'Depeche Mode', 'The Police', 'Anuel AA', 'Rauw Alejandro', 'Ozuna', 'Karol G', 'J Balvin',
  // Cine y TV (actores y directores secundarios)
  'Alicia Vikander', 'Viola Davis', 'Gene Kelly', 'Jet Li', 'Christopher Walken', 'Michelle Yeoh', 'Wes Anderson', 'Inma Cuesta',
  'Adriana Ugarte', 'Mark Ruffalo', 'Rupert Grint', 'Colin Firth', 'Jude Law', 'Ewan McGregor', 'Ian McKellen', 'Patrick Stewart',
  'Gary Oldman', 'Ralph Fiennes', 'Cillian Murphy', 'Chris Rock', 'Steve Carell', 'Bill Murray', 'Owen Wilson', 'Chris Pratt',
  'Andrew Garfield', 'Joaquin Phoenix', 'Jake Gyllenhaal', 'Edward Norton', 'Bradley Cooper', 'Jared Leto', 'Matthew McConaughey',
  'Woody Harrelson', 'Jeff Bridges', 'Jamie Lee Curtis', 'Cate Blanchett', 'Courteney Cox', 'Lisa Kudrow', 'Belén Cuesta', 'Candela Peña',
  'Najwa Nimri', 'Bárbara Lennie', 'Javier Gutiérrez', 'Karra Elejalde', 'Eduard Fernández', 'Luis Zahera', 'José Sacristán', 'Paco Rabal',
  'Lola Dueñas', 'Rosa María Sardà', 'Chus Lampreave', 'Agustín González', 'Daniel Day-Lewis', 'Michael Caine', 'Rami Malek', 'Oscar Isaac',
  'Adam Driver', 'Mads Mikkelsen', 'Christoph Waltz', 'Roger Moore', 'Florence Pugh', 'Anya Taylor-Joy', 'Sydney Sweeney', 'Paul Mescal',
  'Sigourney Weaver', 'Uma Thurman', 'Michelle Pfeiffer', 'Drew Barrymore', 'Peter Jackson', 'Robert Zemeckis', 'James Wan', 'David Fincher',
  'Denis Villeneuve', 'Wes Craven', 'Jordan Peele', 'Alejandro González Iñárritu', 'Alfonso Cuarón', 'Juan Antonio Bayona', 'Isabel Coixet',
  'Fernando León de Aranoa', 'Fernando Trueba', 'Rodrigo Sorogoyen', 'Daniel Monzón', 'Jaime de Armiñán', 'José Luis Garci', 'Carlos Saura',
  'Víctor Erice', 'Pilar Miró', 'Icíar Bollaín', 'Gracia Querejeta', 'Emilio Martínez Lázaro', 'Javier Fesser', 'José Luis Cuerda',
  'Agustí Villaronga', 'Bigas Luna', 'Jaime Chávarri', 'Montxo Armendáriz', 'Ken Loach', 'Orson Welles', 'Billy Wilder', 'Akira Kurosawa',
  'Satoshi Kon', 'Wong Kar-wai', 'Ang Lee', 'Bong Joon-ho', 'Park Chan-wook', 'Hirokazu Kore-eda', 'Federico Fellini', 'Ingmar Bergman',
  'François Truffaut', 'Jean-Luc Godard', 'Jean Renoir', 'Sofia Coppola', 'Greta Gerwig', 'Kathryn Bigelow', 'Chloé Zhao', 'Jane Campion',
  'Lana Wachowski', 'Lilly Wachowski', 'Sergio Leone', 'Mel Brooks', 'Spike Lee', 'David Lynch', 'Terry Gilliam', 'Takeshi Kitano',
  'Miguel Ángel Silvestre', 'Paco León', 'Blanca Suárez', 'Fernando Fernán Gómez', 'José Luis López Vázquez', 'Victoria Abril',
  // Personajes
  'Sackboy', 'Q*bert', 'Doomguy', 'Duke Nukem', 'Bobobo', 'Iznogoud', 'Gaston Lagaffe', 'Corto Maltés', 'Pyramid Head', 'Sora', 'Waluigi',
  'Samus Aran', 'Cloud Strife', 'Sephiroth', 'Arthur Morgan', 'Ezio Auditore', 'Altair', 'Ellie Williams', 'Joel Miller', 'Chun-Li', 'Ryu',
  'Ken', 'Knuckles', 'Ganondorf', 'Brock', 'Vanellope', 'Hiro Hamada', 'Bruno Madrigal', 'Yzma', 'Oogie Boogie', 'Lotso', 'Forky', 'Pinky',
  'Omar Little', 'Don Draper', 'Amélie Poulain', 'Vecna', 'Megatron', 'Carmen Sandiego', 'Astroboy', 'Caillou', 'Pepe Le Pew',
  'Thomas la Locomotora', 'Hipo', 'Chimuelo', 'Calvin', 'Hobbes', 'Calimero', 'Superlópez', 'Capitán Trueno', 'Seiya de Pegaso', 'Eva',
  'Héctor', 'Ryder', 'Peach', 'Alex', 'Mad Hatter', 'Reina de Corazones', 'Betty Boop', 'Olivia', 'Wally', 'Doc Brown', 'Mandaloriano',
  'Hawkeye', 'Trinity', 'Dwight Schrute', 'Michael Scott', 'Leonard Hofstadter', 'Katniss Everdeen', 'Darth Maul', 'Zoro', 'Nami', 'Arenita',
  'Fred', 'Daphne', 'Nobita', 'Trunks', 'Krillin', 'Sasuke', 'Piccolo', 'Luffy', 'Monkey D. Luffy', 'Sailor Moon', 'Zipi', 'Zape',
  'La Reina Malvada', 'Mr. Potato', 'Jessie', 'She-Ra', 'Skeletor', "D'Artagnan", 'Silvestre', 'Robin', 'Remy', 'Bilbo Bolsón', 'Tails',
  'Misty', 'Sub-Zero', 'Scorpion', 'Addams', 'Tyler Durden', 'Thomas Shelby', 'Dexter Morgan', 'Tony Montana', 'Solid Snake', 'Nathan Drake',
  'Kratos', 'Master Chief', 'Geralt de Rivia', 'Hércules Poirot', 'Norman Bates', 'Gulliver', 'Robinson Crusoe',
);

const HUMANITIES = new Set(['Historia', 'Arte', 'Literatura', 'Mitología', 'Ciencia', 'Cultura']);
const NICHE_CATEGORIES = new Set(['Películas', 'Música', 'Cine y TV', 'Personajes']);

function difficulty(r) {
  const k = norm(r.palabra);
  if (HUMANITIES.has(r.categoria)) {
    if (VERY_HARD.has(k)) return 'Muy difícil';
    if (EASY.has(k)) return 'Fácil';
    if (MEDIUM.has(k)) return 'Media';
    return 'Difícil';
  }
  if (r.categoria === 'Series') return EASY.has(k) ? 'Fácil' : MEDIUM_SERIES.has(k) ? 'Media' : 'Difícil';
  if (NICHE_CATEGORIES.has(r.categoria)) return EASY.has(k) ? 'Fácil' : NICHE.has(k) ? 'Difícil' : 'Media';
  if (EASY.has(k)) return 'Fácil';
  if (VERY_HARD.has(k)) return 'Muy difícil';
  if (HARD.has(k)) return 'Difícil';
  return BASE_MEDIUM.has(r.categoria) ? 'Media' : 'Difícil';
}
const POPULARITY = { 'Fácil': 'Muy alta', 'Media': 'Alta', 'Difícil': 'Media', 'Muy difícil': 'Baja' };

// ---------- 5. Infantil: contenido adulto explícito ----------
const ADULT = S(
  'El Padrino', 'Pulp Fiction', 'El exorcista', 'Scream', 'Saw', 'El resplandor', 'Psicosis', 'El silencio de los corderos', 'Seven',
  'American Pie', 'Scary Movie', 'Kill Bill', 'Scarface', 'El precio del poder', 'Casino', 'Uno de los nuestros', 'Heat', 'Apocalypse Now',
  'Platoon', 'El club de la lucha', 'American Beauty', 'Cadena perpetua', 'Django desencadenado', 'Érase una vez en Hollywood', 'Memento',
  'Watchmen', 'Sin City', 'V de Vendetta', 'Superbad', 'Supersalidos', 'Ted', 'Resacón en Las Vegas', 'Full Monty', 'Pesadilla en Elm Street',
  'Viernes 13', 'La cosa', 'It', 'Carrie', 'Alien', 'Depredador', 'Robocop', 'Mad Max', 'Blade Runner', '300', 'Troya',
  'Braveheart', 'Salvar al soldado Ryan', 'La lista de Schindler', 'La naranja mecánica', 'Réquiem por un sueño', 'Cisne negro',
  'American History X', 'El lobo de Wall Street', 'Shutter Island', 'Hereditary', 'Midsommar', 'Insidious', 'Sinister', 'Expediente Warren',
  'Poltergeist', 'La profecía', 'Destino final', 'The Ring', 'It Follows', 'La bruja', 'Déjame salir', 'Un lugar tranquilo',
  'El proyecto de la bruja de Blair', 'Parásitos', '12 años de esclavitud', 'Babel', 'Birdman', 'Spotlight', 'Argo', 'Moonlight', 'Crash',
  'Nomadland', 'Todo a la vez en todas partes', 'Reservoir Dogs', 'La huérfana', 'El orfanato', 'REC', 'Tesis', 'Celda 211', 'Los otros',
  'El sexto sentido', 'Sexto sentido', 'Tiburón', 'Drácula de Bram Stoker', 'El bueno, el feo y el malo', 'Por un puñado de dólares',
  'Érase una vez en América', 'Érase una vez en el Oeste', 'Dirty Harry', 'Arma letal', 'Con Air', 'Face/Off', 'Akira', 'American Psycho',
  'Full Metal Jacket', 'Dunkerque', 'Sospechosos habituales', 'John Wick', 'Fast & Furious', 'Rambo', 'La jungla de cristal', 'Kingsman',
  'Deadpool', 'Logan', 'Escuadrón Suicida', 'Pearl Harbor', 'Black Hawk derribado', 'Master and Commander', 'El efecto mariposa',
  'Algo pasa con Mary', 'Zoolander',
  'Torrente', 'Airbag', 'El día de la bestia', 'La comunidad', 'Las brujas de Zugarramurdi', 'Abre los ojos', 'Hable con ella',
  'Todo sobre mi madre', 'La mala educación', 'Volver', 'Dolor y gloria', 'Mar adentro', 'Contratiempo', 'Perfectos desconocidos',
  'Relatos salvajes', 'El secreto de sus ojos', 'Tres metros sobre el cielo', 'Sin tetas no hay paraíso', 'Kiki, el amor se hace',
  'Breaking Bad', 'Better Call Saul', 'Juego de Tronos', 'The Walking Dead', 'Dexter', 'Los Soprano', 'The Wire', 'Narcos', 'Peaky Blinders',
  'Vis a Vis', 'La casa de papel', 'Élite', 'Euphoria', 'Sex Education', 'Orange Is the New Black', 'Black Mirror', 'Mr. Robot', 'Westworld',
  'The Boys', 'Gen V', 'Invincible', 'True Detective', 'Fargo', 'Hannibal', 'Mindhunter', 'Ozark', 'Succession', 'The Bear', 'Sons of Anarchy',
  'Hijos de la Anarquía', 'Boardwalk Empire', 'Spartacus', 'Deadwood', 'The Shield', 'Ray Donovan', 'Prison Break', 'Dark', 'You',
  'El juego del calamar', 'Squid Game', 'Alice in Borderland', 'Big Mouth', 'BoJack Horseman', 'South Park', 'Padre de familia', 'Rick y Morty',
  'American Dad', 'Archer', 'Vikingos', 'The Witcher', 'House of the Dragon', 'La Casa del Dragón', 'The Last of Us', 'Chernobyl',
  'Física o Química', 'Antidisturbios', '30 monedas', 'La Unidad', 'Fariña', 'Veneno', 'Entrevías', 'The Punisher', 'Daredevil',
  'Jessica Jones', 'Black Sails', 'Homeland', 'House of Cards', 'Shameless', 'Skins', 'Misfits', 'True Blood', 'Lucifer', 'American Horror Story',
  'Yellowjackets', 'The Haunting of Hill House', 'The Haunting of Bly Manor', 'Fear the Walking Dead', 'Six Feet Under', 'Mad Men',
  'Sharp Objects', 'Mare of Easttown', 'The Undoing', 'The Night Of', 'When They See Us', 'Unbelievable', 'Killing Eve', 'Luther',
  'Line of Duty', 'Bodyguard', 'Happy Valley', 'Broadchurch', 'Band of Brothers', 'The Pacific', 'Generation Kill', 'Altered Carbon',
  'Love, Death & Robots', 'Sense8', 'Maniac', 'Girls', 'Entourage', 'Veep', 'Curb Your Enthusiasm', 'Twin Peaks', 'Cyberpunk: Edgerunners',
  'Castlevania', 'Blue Eye Samurai', 'Neon Genesis Evangelion', 'Death Note', 'Ataque a los titanes', 'Demon Slayer', 'Bleach',
  'Walter White', 'Jesse Pinkman', 'Saul Goodman', 'Tony Montana', 'Tyler Durden', 'Dexter Morgan', 'Don Draper', 'Thomas Shelby',
  'Omar Little', 'Hannibal Lecter', 'Norman Bates', 'Freddy Krueger', 'Vito Corleone', 'John McClane', 'Rick Sánchez', 'Morty Smith',
  'Brian Griffin', 'Peter Griffin', 'Stewie Griffin', 'Barney Stinson', 'Cersei Lannister', 'Daenerys Targaryen', 'Tyrion Lannister',
  'Jon Snow', 'Geralt de Rivia', 'Vecna', 'Kratos', 'Master Chief', 'Doomguy', 'Duke Nukem', 'Sub-Zero', 'Scorpion', 'Pyramid Head',
  'Arthur Morgan', 'Joel Miller', 'Ellie Williams', 'Nathan Drake', 'Solid Snake', 'Harry el Sucio', 'Neo', 'Trinity', 'Wolverine', 'Lobezno',
  'Grand Theft Auto', 'Call of Duty', 'Counter-Strike', 'Mortal Kombat', 'Free Fire', 'World of Warcraft', 'League of Legends', 'Blackjack',
  'Heineken', 'Bacardi', 'Cruzcampo', 'Mahou', 'Estrella Galicia', 'Amstel', 'Guinness', 'Corona', 'Desperados', 'Absolut', 'J&B', 'Martini',
  'Campari', 'Baileys', 'San Miguel', 'Damm', 'Estrella Damm', 'Voll-Damm', 'Tinder', 'Red Bull', 'Monster', 'Mata Hari', 'Marilyn Monroe',
  'Hitler', 'Adolf Hitler', 'Stalin', 'Joseph Stalin', 'Mussolini', 'Benito Mussolini', 'Francisco Franco', 'Nelson Mandela', 'Kim Jong-un', 'Vladimir Putin',
  'Mao Zedong', 'Lenin', 'Trotski', 'Fidel Castro', 'Calígula', 'Nerón', 'Messalina', 'Agripina', 'Rasputín', 'Sigmund Freud', 'Karl Marx',
  'Friedrich Nietzsche', 'Bad Bunny', 'Bad Gyal', 'Anuel AA', 'Cardi B', 'Nicki Minaj', 'Megan Thee Stallion', 'Doja Cat', 'Travis Scott',
  'Eminem', '50 Cent', 'Dr. Dre', 'Snoop Dogg', 'Tupac', 'Notorious B.I.G.', 'Kendrick Lamar', 'Marilyn Manson', 'Slipknot', 'Rammstein',
  'Motörhead', 'Korn', 'Limp Bizkit', 'System of a Down', 'La Polla Records', 'Kortatu', 'Extremoduro', 'Ska-P', 'Morad', 'Duki',
  'Mala Rodríguez', 'C. Tangana', 'Rels B',
  'La Celestina', 'Madame Bovary', 'American Gothic', 'Saturno devorando a su hijo', 'La maja desnuda', 'El rapto de las sabinas',
  'El jardín de las delicias', 'El retrato de Dorian Gray', 'Misery', 'El cementerio de animales', 'Stephen King', 'Fahrenheit 451', '1984',
  'Rebelión en la granja', 'Crimen y castigo', 'El perfume', 'Millennium', 'La naranja mecánica', 'Neuromante', 'American Psycho',
  'Kim Kardashian', 'Kylie Jenner', 'Paris Hilton', 'Wall Street', 'Área 51', 'Hiroshima', 'Nagasaki', 'Woodstock', 'Peste Negra',
  'Guerra Civil Española', 'Segunda Guerra Mundial', 'Primera Guerra Mundial', 'Día D', 'Desembarco de Normandía', 'Hundimiento del Titanic',
  'Cruzadas', 'Batalla de Lepanto', 'Batalla de Waterloo', 'Batalla de Trafalgar', 'Batalla de las Termópilas', 'Guerra Fría',
);
const KID_CATEGORIES = new Set(['Personajes', 'Videojuegos', 'Marcas', 'Lugares', 'Deportes', 'Naturaleza', 'Mitología']);
const KID_SPORTS = S(
  'Lionel Messi', 'Cristiano Ronaldo', 'Rafa Nadal', 'Fernando Alonso', 'Michael Jordan', 'Serena Williams',
  'Diego Maradona', 'Pelé', 'Real Madrid', 'FC Barcelona', 'Selección española', 'Mundial de Fútbol', 'Juegos Olímpicos',
);
const KID_MUSIC = S(
  'Rosalía', 'Shakira', 'Michael Jackson', 'Freddie Mercury', 'Adele', 'The Beatles', 'Queen', 'ABBA', 'Coldplay',
  'Imagine Dragons', 'One Direction', 'Taylor Swift', 'Justin Bieber', 'Ed Sheeran', 'Bruno Mars', 'Beyoncé', 'Aitana',
  'Dua Lipa', 'Billie Eilish', 'BTS', 'BLACKPINK',
);
const KID_GAMES = S(
  'Tetris', 'Pokémon Go', 'Minecraft', 'Fortnite', 'Roblox', 'Brawl Stars', 'Among Us', 'Super Mario Bros.', 'Mario Kart',
  'Wii Sports', 'Just Dance', 'Animal Crossing', 'Candy Crush', 'Clash Royale', 'Nintendo',
);
const KID_MYTHOLOGY = S(
  'Zeus', 'Hércules', 'Medusa', 'Poseidón', 'Hades', 'Pegaso', 'Cupido', 'Sirena', 'Unicornio', 'Dragón', 'Fénix',
  'Minotauro', 'Cíclope', 'Yeti', 'Bigfoot', 'Kraken', 'Cerbero', 'Ogro', 'Hada', 'Elfo', 'Vampiro', 'Zombi',
);
const KID_ARTE = S('Frida Kahlo', 'Pablo Picasso', 'Vincent van Gogh', 'Salvador Dalí', 'Leonardo da Vinci', 'La Gioconda', 'Miguel Ángel', 'Las Meninas', 'La última cena', 'El grito');
const KID_CIENCE = S('Stephen Hawking', 'Galileo Galilei', 'Nikola Tesla', 'Thomas Edison', 'Alexander Fleming');
const KID_CULTURE = S('Papa Francisco');
const KID_HISTORY = S('Tutankamón', 'Antiguo Egipto', 'Llegada a la Luna', 'Imperio Romano', 'Julio César', 'Cristóbal Colón');
const KID_LITERATURE = S('Miguel de Cervantes', 'William Shakespeare', 'J. K. Rowling', 'Don Quijote', 'Harry Potter', 'Sherlock Holmes', 'Romeo y Julieta', 'Hansel y Gretel', 'Pulgarcito', 'Alí Babá', 'El Principito', 'Rapunzel', 'Julio Verne', 'Robinson Crusoe');
const KID_PLACES = S('Torre Eiffel', 'Sagrada Familia', 'Estatua de la Libertad', 'Nueva York', 'París', 'Londres', 'Roma', 'Madrid', 'Barcelona', 'Egipto', 'Gran Muralla China', 'Taj Mahal', 'Disneyland', 'Big Ben', 'Coliseo de Roma', 'Pirámides de Giza', 'Machu Picchu', 'Cristo Redentor', 'Monte Everest', 'Desierto del Sáhara', 'Islas Canarias', 'Venecia', 'Tokio', 'España', 'Francia', 'Italia', 'Japón', 'Estados Unidos', 'México', 'Argentina', 'Brasil');
const KID_BRANDS = S('Coca-Cola', "McDonald's", 'Lego', 'Apple', 'Google', 'Netflix', 'Amazon', 'IKEA', 'Nike', 'Adidas', 'Zara', 'Disney', 'Ferrari', 'Mercedes-Benz', 'Volkswagen', 'Burger King', 'Nutella', 'Kinder', 'Nesquik', 'Colacao', 'Chupa Chups', 'Donuts', 'Pepsi', 'Samsung', 'Spotify', 'Pixar', 'Nintendo', 'Play-Doh', 'Hot Wheels', 'Mattel', 'Roblox', 'YouTube', 'TikTok', 'WhatsApp');
const KID_MOVIES = S('El Rey León', 'Frozen', 'Toy Story', 'Coco', 'Los Increíbles', 'Shrek', 'Madagascar', 'Buscando a Nemo', 'Monstruos, S.A.', 'Up', 'Ratatouille', 'La Bella y la Bestia', 'Aladdín', 'Mulán', 'Vaiana', 'Encanto', 'Wall-E', 'Enredados', 'El libro de la selva', 'Alicia en el País de las Maravillas', 'Blancanieves y los siete enanitos', 'Tarzán', 'Cómo entrenar a tu dragón', 'Gru, mi villano favorito', 'Los Croods', 'Ice Age', 'Hotel Transilvania', 'Lilo y Stitch', 'Del revés', 'Elemental', 'Luca', 'Cars', 'Brave');
const KID_CHARACTERS = S('Mafalda', 'Tintín', 'Astérix', 'Obélix', 'Darth Vader', 'La Sirenita', 'Pitufina', 'Woody', 'Buzz Lightyear', 'Mickey Mouse', 'Pato Donald', 'Goofy', 'Simba', 'Ariel', 'Cenicienta', 'Blancanieves', 'Peter Pan', 'Campanilla', 'Bob Esponja', 'Scooby-Doo', 'Tom', 'Jerry', 'Superman', 'Batman', 'Spider-Man', 'Hulk', 'Iron Man', 'Thor', 'Capitán América', 'Wonder Woman', 'Hermione Granger', 'Ron Weasley', 'Pinocho', 'Caperucita Roja', 'Doraemon', 'Sonic', 'Pac-Man', 'Pikachu', 'Lucky Luke', 'Mortadelo', 'Filemón', 'Garfield', 'Snoopy', 'Hello Kitty', 'Stitch', 'Winnie the Pooh', 'Dumbo', 'Bambi', 'Gru', 'Minion', 'Kung Fu Panda', 'Mowgli', 'Baloo', 'Dora la Exploradora', 'Peppa Pig', 'Pocoyó', 'Ash Ketchum', 'Minnie Mouse', 'Pluto', 'La Pantera Rosa', 'Wally', 'Tom y Jerry', 'Mario', 'Luigi', 'Princesa Peach', 'Luke Skywalker', 'Yoda', 'Chewbacca', 'Mary Poppins', 'Pippi Calzaslargas', 'Son Goku', 'Nemo', 'Dory', 'Elsa', 'Anna', 'Genio', 'Bestia', 'Mr. Bean', 'Patricio Estrella', 'Popeye', 'Tigger', 'Po', 'Rayo McQueen', 'Olaf', 'Bella', 'Groot', 'Zipi y Zape', 'Bugs Bunny', 'Piolín', 'Shaggy', 'Mickey Mouse', 'Baymax', 'Patrulla Canina', 'Steve de Minecraft');
const KID_SERIES = S('Heidi', 'Bola de Dragón', 'Los Simpson', 'Modern Family', 'Los Picapiedra', 'Tom y Jerry', 'Las Tortugas Ninja', 'Pokémon', 'Oliver y Benji', 'Los Lunnis', 'Phineas y Ferb', 'Hora de aventuras', 'Dragon Ball', 'Looney Tunes', 'Los Pitufos', 'Patrulla Canina', 'Power Rangers');
const KID_CINE_TV = S('Antonio Banderas', 'Johnny Depp', 'Tom Hanks', 'Jackie Chan', 'Bruce Lee', 'Macaulay Culkin', 'Tom Holland', 'Robert Downey Jr.', 'Harrison Ford', 'Will Smith');
function infantil(r, dif) {
  const k = norm(r.palabra);
  if (ADULT.has(k)) return false;
  const allowed = {
    Arte: KID_ARTE,
    Ciencia: KID_CIENCE,
    Cine: KID_CINE_TV,
    'Cine y TV': KID_CINE_TV,
    Cultura: KID_CULTURE,
    Deportes: KID_SPORTS,
    Historia: KID_HISTORY,
    Literatura: KID_LITERATURE,
    Lugares: KID_PLACES,
    Marcas: KID_BRANDS,
    Mitología: KID_MYTHOLOGY,
    Música: KID_MUSIC,
    Naturaleza: new Set(['orangutan', 'lince', 'murcielago', 'calamar', 'halcon', 'caiman', 'avispa', 'saltamontes', 'gusano']),
    Personajes: KID_CHARACTERS,
    Películas: KID_MOVIES,
    Series: KID_SERIES,
    Videojuegos: KID_GAMES,
  }[r.categoria];
  return allowed?.has(k) ?? false;
}

// ---------- Ejecución ----------
const bankRows = parseCsv(fs.readFileSync(bankPath, 'utf8').replace(/^\uFEFF/, ''));
const headers = bankRows.shift();
if (!headers.includes('internacional')) headers.push('internacional');
let rows = bankRows.map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
const before = rows.length;

rows = rows.filter(r => !REMOVE.has(r.id));
for (const r of rows) {
  if (RENAME[r.id]) r.palabra = RENAME[r.id];
  r.palabra = r.palabra.replace(/’/g, "'").replace(/\s+/g, ' ');
  Object.assign(r, MOVE[r.id] ?? {});
  r.subcategoria = unifySubcategory(r);
  r.dificultad = difficulty(r);
  r.popularidad = POPULARITY[r.dificultad];
  r.infantil = infantil(r, r.dificultad);
  r.internacional = !NON_INTERNATIONAL.has(norm(r.palabra)) && (
    parseBoolean(r.internacional) || ['internacional', 'international', 'global'].includes(norm(r.alcance))
  );
}
// Duplicados exactos que aparezcan tras renombrar: se conserva el de id más bajo.
const seen = new Set();
rows = rows.filter(r => { const k = `${norm(r.palabra)}|${r.categoria}`; if (seen.has(k)) { REMOVE.add(r.id); return false; } seen.add(k); return true; });

fs.writeFileSync(bankPath, toCsv(headers, rows.map(r => headers.map(h => r[h]))), 'utf8');

// Traducciones de palabras: quitar ids eliminados.
const trRows = parseCsv(fs.readFileSync(trPath, 'utf8').replace(/^\uFEFF/, ''));
const trHeaders = trRows.shift();
const keptIds = new Set(rows.map(r => r.id));
const trKept = trRows.filter(r => keptIds.has(r[0].trim()));
fs.writeFileSync(trPath, toCsv(trHeaders, trKept), 'utf8');

// Traducciones de categoría/subcategoría: podar valores que ya no se usan.
const catRows = parseCsv(fs.readFileSync(catPath, 'utf8').replace(/^\uFEFF/, ''));
const catHeaders = catRows.shift();
const usedCat = new Set(rows.map(r => r.categoria));
const usedSub = new Set(rows.map(r => r.subcategoria));
const catKept = catRows.filter(r => (r[0] === 'categoria' ? usedCat : usedSub).has(r[1]));
fs.writeFileSync(catPath, toCsv(catHeaders, catKept), 'utf8');

const missingEn = [...usedSub].filter(s => !catKept.some(r => r[0] === 'subcategoria' && r[1] === s && r[2] === 'en'));
console.log(`filas: ${before} -> ${rows.length} (eliminadas ${before - rows.length})`);
console.log(`traducciones de palabras: ${trRows.length} -> ${trKept.length}`);
console.log(`traducciones de categoría/subcategoría: ${catRows.length} -> ${catKept.length}`);
if (missingEn.length) console.log('SUBCATEGORÍAS SIN TRADUCCIÓN EN:', missingEn.join(' | '));
