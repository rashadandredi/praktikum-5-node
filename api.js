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

let user = require("./user")
let pelanggaran = require("./pelanggaran")
const moment = require("moment")

app.use("/user", user)
app.use("/pelanggaran", pelanggaran)

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

// TABEL SISWA

//endpoint akses data siswa
app.get("/siswa",validateToken(), (req, res) => {
    //create sql query
    let sql = "select * from siswa"

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
                siswa: result //isi data
            }
        }
        res.json(response) //send response
    })
})

//endpoint akses data siswa berdasarkan id_siswa tertentu
app.get("/siswa/:id",validateToken(), (req, res) => {
    let data = {
        id_siswa: req.params.id
    }
    //create sql query
    let sql = "select * from siswa where ?"

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
                siswa: result //isi data
            }
        }
        res.json(response) //send response
    })
})

// endpoint menyimpan data siswa
app.post("/siswa",validateToken(), (req,res) => {

    //prepare data
    let data = {
        nis: req.body.nis,
        nama_siswa: req.body.nama_siswa,
        kelas: req.body.kelas,
        poin: req.body.poin
    }

    //create sql query insert
    let sql = "insert into siswa set ?"

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

//endpoint mengubah data siswa
app.put("/siswa",validateToken(), (req,res) => {

    //prepare data
    let data = [
        //data
        {
            nis: req.body.nis,
            nama_siswa: req.body.nama_siswa,
            kelas: req.body.kelas,
            poin: req.body.poin
        },

        //parameter (primary key)
        {
            id_siswa: req.body.id_siswa
        }
    ]

    //create sql query update
    let sql = "update siswa set ? where ?"

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

//endpoint menghapus data siswa berdasarkan id_siswa
app.delete("/siswa/:id",validateToken(), (req,res) => {
    //prepare data
    let data = {
        id_siswa: req.params.id
    }

    //create query sql delete
    let sql = "delete from siswa where ?"

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

//endpoint menambahkan data pelanggaran siswa
app.post("/pelanggaran_siswa",validateToken(), (req,res) => {
    //prepare data to pelanggaran siswa
    let data = {
        id_siswa: req.body.id_siswa,
        id_user: req.body.id_user,
        waktu: moment().format('YYYY-MM-DD HH:mm::ss') //get current time
    }

    //parse to JSON
    let pelanggaran = JSON.parse(req.body.pelanggaran)

    //create query insert to pelanggaran_siswa
    let sql = "insert into pelanggaran_siswa set ?"

    //run query
    db.query(sql, data, (error, result) => {
        let response = null

        if (error) {
            res.json({message: error.message})
        } else {

            //get last inserted id_pelanggaran
            let lastID = result.insertId

            //prepare data to detail_pelanggaran
            let data = []
            for (let index = 0; index < pelanggaran.length; index++) {
                data.push([
                    lastID, pelanggaran[index].id_pelanggaran
                ])
            }

            //create query insert detail_pelanggaran
            let sql = "insert into detail_pelanggaran_siswa values ?"

            db.query(sql, [data], (error, result) => {
                if (error) {
                    res.json({message: error.message})
                } else {
                    res.json({message: "Data has been inserted"})
                }
            })
        }
    })
})

//endpoint menampilkan data pelanggaran siswa
app.get("/pelanggaran_siswa",validateToken(), (req,res) => {
    //create sql query
    let sql = "select p.id_pelanggaran_siswa, p.id_siswa,p.waktu, s.nis, s.nama_siswa, p.id_user, u.nama_user " +
    "from pelanggaran_siswa p join siswa s on p.id_siswa = s.id_siswa " +
    "join user u on p.id_user = u.id_user"

    //run query
    db.query(sql, (error, result) => {
        if (error) {
            res.json({ message: error.message})
        } else {
            res.json({
                count: result.length,
                pelanggaran_siswa: result
            })
        }
    })
})

//endpoint untuk menampilkan detail_pelanggaran
app.get("/pelanggaran_siswa/:id_pelanggaran_siswa",validateToken(), (req,res) => {
    let param = { id_pelanggaran_siswa: req.params.id_pelanggaran_siswa}

    //create sql query
    let sql = "select p.nama_pelanggaran, p.poin " +
    "from detail_pelanggaran_siswa dps join pelanggaran p "+
    "on p.id_pelanggaran = dps.id_pelanggaran " +
    "where ?"

    db.query(sql, param, (error, result) => {
        if (error) {
            res.json({ message: error.message})
        } else {
            res.json({
                count: result.length,
                detail_pelanggaran_siswa: result
            })
        }
    })
})

//endpoint untuk menghapus data pelanggaran_siswa
app.delete("/pelanggaran_siswa/:id_pelanggaran_siswa",validateToken(), (req, res) => {
    let param = { id_pelanggaran_siswa: req.params.id_pelanggaran_siswa}

    //create sql query delete detail_pelanggaran
    let sql = "delete from detail_pelanggaran_siswa where ?"

    db.query(sql, param, (error, result) => {
        if (error) {
            res.json({ message: error.message})
        } else {
            let param = { id_pelanggaran_siswa: req.params.id_pelanggaran_siswa}

            //create sql query delete pelanggaran_siswa
            let sql = "delete from pelanggaran_siswa where ?"
            db.query(sql, param, (error, result) => {
                if (error) {
                    res.json({ message: error.message})
                } else {
                    res.json({message: "Data has been deleted"})
                }
            })
        }
    })
})

//endpoint login user (authentication)
app.post("/user/auth", (req, res) => {
    //tampung username dan password
    let param = [
        req.body.username, //username
        md5(req.body.password) //password
    ]

    //create sql query
    let sql = "select * from user where username = ? and password = ?"

    //run query
    db.query(sql, param, (error, result) => {
        if (error) throw error

        //cek jumlah data hasil query
        if (result.length > 0) {
            //user tersedia
            res.json({
                message: "Logged",
                token: crypt.encrypt(result[0].id_user), //generate token
                data: result
            })
        } else {
            //user tidak tersedia
            res.json({
                message: "Invalid username/password"
            })
        }
    })
})

app.listen(8000, () => {
    console.log("Run on port 8000")
})
