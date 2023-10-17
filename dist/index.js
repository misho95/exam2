"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const { readFile, writeFile } = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const sessionStorage = require("sessionstorage-for-nodejs");
const app = (0, express_1.default)();
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/static", express_1.default.static(__dirname + "public"));
app.use(express_1.default.static("public"));
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");
app.use(express_1.default.json());
const authMiddleWear = (req, res, next) => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
        res.redirect("/signin");
        res.status(403);
        return;
    }
    req["token"] = token;
    next();
};
const authMiddleWearForm = (req, res, next) => {
    const localToken = sessionStorage.getItem("accessToken");
    if (localToken) {
        res.redirect("/");
        return;
    }
    next();
};
app.get("/", authMiddleWear, (req, res) => {
    readFile(path.join(__dirname, "expense.json"), (err, data) => {
        if (err) {
            res.render("index", { expenses: [] });
            return;
        }
        const token = req.token;
        const allExpenses = JSON.parse(data.toString());
        const expenses = allExpenses.filter((e) => {
            if (token && +e.userId === +token) {
                return e;
            }
        });
        res.render("index", { expenses });
    });
});
app.get("/add", authMiddleWear, (req, res) => {
    res.render("add");
});
app.post("/add", authMiddleWear, (req, res) => {
    const { amount, type, category } = req.body;
    const exp = {
        id: new Date().getTime(),
        amount: +amount,
        type,
        category,
        userId: req.token,
    };
    readFile(path.join(__dirname, "expense.json"), (err, data) => {
        if (err) {
            // create new file
            writeFile("expense.json", JSON.stringify([exp]), function (err) {
                if (err)
                    throw err;
                res.status(200);
                return;
            });
        }
        else {
            const parseData = JSON.parse(data.toString());
            writeFile("expense.json", JSON.stringify([...parseData, exp]), (err) => {
                if (err)
                    throw err;
                res.status(200);
            });
        }
    });
    res.redirect("/");
});
app.delete("/delete/:id", authMiddleWear, (req, res) => {
    const id = req.params.id;
    readFile(path.join(__dirname, "expense.json"), (err, data) => {
        if (err) {
            res.status(400);
            throw err;
        }
        const expenses = JSON.parse(data.toString());
        const deleteData = expenses.filter((e) => {
            if (+e.id !== +id)
                return e;
        });
        writeFile("expense.json", JSON.stringify(deleteData), (err) => {
            if (err)
                throw err;
            res.status(200).send("okey!");
        });
    });
});
app.get("/edit/:id", authMiddleWear, (req, res) => {
    const id = req.params.id;
    readFile(path.join(__dirname, "expense.json"), (err, data) => {
        if (err) {
            res.status(400);
            throw err;
        }
        const expenses = JSON.parse(data.toString());
        const findExpense = expenses.find((e) => {
            if (+e.id === +id)
                return e;
        });
        const expense = findExpense;
        res.render("edit", { expense });
        res.status(200);
    });
});
app.post("/edit/:id", authMiddleWear, (req, res) => {
    const id = req.params.id;
    const { amount, type, category } = req.body;
    readFile(path.join(__dirname, "expense.json"), (err, data) => {
        if (err) {
            res.status(400);
            throw err;
        }
        const expenses = JSON.parse(data.toString());
        const update = expenses.map((e) => {
            if (+e.id === +id) {
                return Object.assign(Object.assign({}, e), { amount,
                    type,
                    category });
            }
            else {
                return e;
            }
        });
        writeFile("expense.json", JSON.stringify(update), (err) => {
            if (err) {
                res.status(400);
                throw err;
            }
            res.status(200);
            res.redirect("/");
        });
    });
});
app.get("/signin", authMiddleWearForm, (req, res) => {
    res.render("signin");
});
app.post("/signin", authMiddleWearForm, (req, res) => {
    readFile(path.join(__dirname, "users.json"), (err, data) => {
        if (err) {
            res.status(400);
            return;
        }
        const parseUsers = JSON.parse(data.toString());
        const findUser = parseUsers.find((usr) => {
            if (usr.email === req.body.email && usr.pass === req.body.pass) {
                return usr;
            }
        });
        if (!findUser) {
            res.status(400);
            res.send({ error: "Invalid Credentials!" });
            return;
        }
        sessionStorage.setItem("accessToken", findUser.id);
        res.status(200);
        res.redirect("/");
    });
});
app.get("/signup", authMiddleWearForm, (req, res) => {
    readFile(path.join(__dirname, "users.json"), (err, data) => {
        if (err) {
            res.render("signup", { data: [] });
            return;
        }
        const userData = JSON.parse(data.toString());
        res.render("signup", { data: userData });
    });
});
app.post("/signup", authMiddleWearForm, (req, res) => {
    const user = {
        id: new Date().getTime(),
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        pass: req.body.pass,
    };
    readFile(path.join(__dirname, "users.json"), (err, data) => {
        if (err) {
            // create new file
            writeFile("users.json", JSON.stringify([user]), function (err) {
                if (err)
                    throw err;
                res.status(200);
                sessionStorage.setItem("accessToken", user.id);
                return;
            });
        }
        else {
            const parsedUserData = JSON.parse(data.toString());
            writeFile("users.json", JSON.stringify([...parsedUserData, user]), (err) => {
                if (err)
                    throw err;
                res.status(200);
                sessionStorage.setItem("accessToken", user.id);
            });
        }
    });
    res.redirect("/");
});
app.post("/logout", authMiddleWear, (req, res) => {
    if (!req.token) {
        res.status(400);
        return;
    }
    sessionStorage.removeItem("accessToken");
    res.status(200);
    res.redirect("/signin");
});
app.listen(3000, () => console.log("server is on port 3000"));
