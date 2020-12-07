const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const mysql = require("mysql")
const md5 = require("md5")
const Cryptr = require("cryptr")
const crypt = new Cryptr("140533601726") //secret key

//implementation
const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

//create mysql connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "pelanggaran_siswa"
})

db.connect(error => {
    if (error) {
        console.log(error.message)
    } else {
        console.log("MySQL Connected")
    }
})

validateToken = () => {
    return (req, res, next) => {
        //cek keberadaan "Token" pada request header
        if (!req.get("Token")) {
            //jika "Token" tidak ada
            res.json({
                message: "Access Forbidden"
            })
        } else {
            //tampung nilai Token
            let token = req.get("Token")

            //decrypt token menjadi id_user
            let decryptToken = crypt.decrypt(token)

            //sql cek id_user
            let sql = "select * from user where ?"

            //set parameter
            let param = { id_user: decryptToken}

            //run query
            db.query(sql, param, (error, result) => {
                if (error) throw error
                //cek keberadaan id_user
                if (result.length > 0) {
                    //id_user tersedia
                    next()
                } else {
                    //jika user tidak tersedia
                    res.json({
                        message: "Invalid Token"
                    })
                }
            })
        }
    }
}

//TABEL USER

//endpoint akses data user
app.get("/",validateToken(), (req, res) => {
    //create sql query
    let sql = "select * from user"

    //run query
    db.query(sql, (error, result) => {
        let response = null
        if (error) {
            response = {
                message: error.message // pesan error
            }
        } else {
            response = {
                count: result.length, //jumlah data
                user: result //isi data
            }
        }
        res.json(response) //send response
    })
})

//endpoint akses data user berdasarkan id_user tertentu
app.get("/:id",validateToken(), (req, res) => {
    let data = {
        id_user: req.params.id
    }
    //create sql query
    let sql = "select * from user where ?"

    //run query
    db.query(sql, data, (error, result) => {
        let response = null
        if (error) {
            response = {
                message: error.message //pesan error
            }
        } else {
            response = {
                count: result.length, //jumlah data
                user: result //isi data
            }
        }
        res.json(response) //send response
    })
})

// endpoint menyimpan data user
app.post("/",validateToken(), (req,res) => {

    //prepare data
    let data = {
        nama_user: req.body.nama_user,
        username: req.body.username,
        password: md5(req.body.password)
    }

    //create sql query insert
    let sql = "insert into user set ?"

    //run query
    db.query(sql, data, (error, result) => {
        let response = null
        if (error) {
            response = {
                message: error.message
            }
        } else {
            response = {
                message: result.affectedRows + " data inserted"
            }
        }
        res.json(response) //send response
    })
})

//endpoint mengubah data user
app.put("/",validateToken(), (req,res) => {

    //prepare data
    let data = [
        //data
        {
            nama_user: req.body.nama_user,
            username: req.body.username,
            password: md5(req.body.password)
        },

        //parameter (primary key)
        {
            id_user: req.body.id_user
        }
    ]

    //create sql query update
    let sql = "update user set ? where ?"

    //run query
    db.query(sql, data, (error, result) => {
        let response = null
        if (error) {
            response = {
                message: error.message
            }
        } else {
            response = {
                message: result.affectedRows + " data updated"
            }
        }
        res.json(response) //send response
    })
})

//endpoint menghapus data user berdasarkan id_user
app.delete("/:id",validateToken(), (req,res) => {
    //prepare data
    let data = {
        id_user: req.params.id
    }

    //create query sql delete
    let sql = "delete from user where ?"

    //run query
    db.query(sql, data, (error, result) => {
        let response = null
        if (error) {
            response = {
                message: error.message
            }
        } else {
            response = {
                message: result.affectedRows + " data deleted"
            }
        }
        res.json(response) //send response
    })
})

module.exports = app
