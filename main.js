// load libraries
const express = require('express');
const handlebars = require('express-handlebars');

//get the mysql drier with promise support
const mysql = require('mysql2/promise');

// configure sql
const SQL_FIND_BY_NAME = 'select * from apps where name like ? limit 10 offset ?';

// configure environment
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;

// create database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'playstore',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 4,
    timezone: '+08:00'
});

const startApp = async (app, pool) => {
    try {
        // acquire a connection from the connection pool
        const conn = await pool.getConnection();

        console.info(`Pinging database...`);
        await conn.ping;

        // release the connnection
        conn.release();

        // start the app
        app.listen(PORT, () => {
            console.log(`Application initialized on PORT: ${PORT} at ${new Date()}`);
        })

    } catch (e) {
        console.error(`Cannot ping database: ${e}`);
    }

}

// create express istances
const app = express();

// configure handlebars
app.engine('hbs', handlebars({defaultLayout: 'default.hbs'}));
app.set('view engine', 'hbs');

// configure routes
app.get('/',(req, res) => {
    res.status(200);
    res.type('text/html');
    res.render('index');
})

app.get('/search', 
    async (req, res) => {
        const q = req.query['q'];
        const currentOffset = parseInt(req.query['currentOffset']);

        // acquire a connection from the connection pool
        const conn = await pool.getConnection();

        try {
            // perform the query
            // const result = await conn.query(SQL_FIND_BY_NAME, [`%${q}`, 10]);
            // const recs = result[0];
            const [recs, __ ] = await conn.query(SQL_FIND_BY_NAME, [`%${q}%`, currentOffset]);

            console.info('recs = ', recs);

            res.status(200);
            res.type('text/html');
            res.render('result',{
                queryString: q,
                recs: recs,
                hasResult: recs.length > 0,
                previousPageOffset: currentOffset - 10,
                nextPageOffset: currentOffset + 10,
                isFirstPage: currentOffset < 10,
                isLastPage: recs.length < 10
            });
        } catch (e) {
            console.error('Error performing the query ', e);
        } finally {
            // release the connnection
            conn.release();
        }
    }
)


// load static
app.use(express.static(__dirname + '/public'));

// start the application
startApp(app, pool);