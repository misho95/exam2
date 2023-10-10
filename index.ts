import express, { Express, Request, Response, NextFunction } from "express";
const { readFile, writeFile } = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const sessionStorage = require("sessionstorage-for-nodejs");
const app: Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
// 1. uses ejs template engine
app.use("/static", express.static(__dirname + "/public"));

app.set("view engine", "ejs");
app.use(express.json());

interface RequestCustom extends express.Request {
  token?: number;
}

interface ExpenseType {
  id: number;
  amount: number;
  type: string;
  category: string;
  userId: number;
}

interface UsersType {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  pass: string;
}

const authMiddleWear = (
  req: RequestCustom,
  res: Response,
  next: NextFunction
) => {
  const token = sessionStorage.getItem("accessToken");
  if (!token) {
    res.redirect("/signin");
    res.status(403);
    return;
  }

  req["token"] = token;
  next();
};

const authMiddleWearForm = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const localToken = sessionStorage.getItem("accessToken");
  if (localToken) {
    res.redirect("/");
    return;
  }

  next();
};

app.get("/", authMiddleWear, (req: RequestCustom, res: Response) => {
  readFile(
    path.join(__dirname, "expense.json"),
    (err: NodeJS.ErrnoException | null, data: string | Buffer) => {
      if (err) {
        res.render("index", { expenses: [] });
        return;
      }
      const token = req.token;
      const allExpenses: ExpenseType[] = JSON.parse(data.toString());
      const expenses = allExpenses.filter((e) => {
        if (token && +e.userId === +token) {
          return e;
        }
      });
      res.render("index", { expenses });
    }
  );
});

app.get("/add", authMiddleWear, (req: RequestCustom, res: Response) => {
  res.render("add");
});

app.post("/add", authMiddleWear, (req: RequestCustom, res: Response) => {
  const { amount, type, category } = req.body;

  const exp = {
    id: new Date().getTime(),
    amount: +amount,
    type,
    category,
    userId: req.token,
  };

  readFile(
    path.join(__dirname, "expense.json"),
    (err: NodeJS.ErrnoException | null, data: string | Buffer) => {
      if (err) {
        // create new file
        writeFile(
          "expense.json",
          JSON.stringify([exp]),
          function (err: NodeJS.ErrnoException | null) {
            if (err) throw err;
            res.status(200);
            return;
          }
        );
      } else {
        const parseData: ExpenseType[] = JSON.parse(data.toString());
        writeFile(
          "expense.json",
          JSON.stringify([...parseData, exp]),
          (err: NodeJS.ErrnoException | null) => {
            if (err) throw err;
            res.status(200);
          }
        );
      }
    }
  );

  res.redirect("/");
});

app.delete(
  "/delete/:id",
  authMiddleWear,
  (req: RequestCustom, res: Response) => {
    const id = req.params.id;

    readFile(
      path.join(__dirname, "expense.json"),
      (err: NodeJS.ErrnoException | null, data: string | Buffer) => {
        if (err) {
          res.status(400);
          throw err;
        }
        const expenses: ExpenseType[] = JSON.parse(data.toString());
        const deleteData = expenses.filter((e) => {
          if (+e.id !== +id) return e;
        });

        writeFile(
          "expense.json",
          JSON.stringify(deleteData),
          (err: NodeJS.ErrnoException | null) => {
            if (err) throw err;
            res.status(200).send("okey!");
          }
        );
      }
    );
  }
);

app.get("/edit/:id", authMiddleWear, (req: RequestCustom, res: Response) => {
  const id = req.params.id;

  readFile(
    path.join(__dirname, "expense.json"),
    (err: NodeJS.ErrnoException | null, data: string | Buffer) => {
      if (err) {
        res.status(400);
        throw err;
      }

      const expenses: ExpenseType[] = JSON.parse(data.toString());

      const findExpense = expenses.find((e) => {
        if (+e.id === +id) return e;
      });

      const expense = findExpense;

      res.render("edit", { expense });
      res.status(200);
    }
  );
});

app.post("/edit/:id", authMiddleWear, (req: RequestCustom, res: Response) => {
  const id = req.params.id;
  const { amount, type, category } = req.body;

  readFile(
    path.join(__dirname, "expense.json"),
    (err: NodeJS.ErrnoException | null, data: string | Buffer) => {
      if (err) {
        res.status(400);
        throw err;
      }

      const expenses: ExpenseType[] = JSON.parse(data.toString());

      const update = expenses.map((e) => {
        if (+e.id === +id) {
          return {
            ...e,
            amount,
            type,
            category,
          };
        } else {
          return e;
        }
      });

      writeFile(
        "expense.json",
        JSON.stringify(update),
        (err: NodeJS.ErrnoException | null) => {
          if (err) {
            res.status(400);
            throw err;
          }
          res.status(200);
          res.redirect("/");
        }
      );
    }
  );
});

app.get("/signin", authMiddleWearForm, (req: Request, res: Response) => {
  res.render("signin");
});

app.post("/signin", authMiddleWearForm, (req: Request, res: Response) => {
  readFile(
    path.join(__dirname, "users.json"),
    (err: NodeJS.ErrnoException | null, data: string | Buffer) => {
      if (err) {
        res.status(400);
        return;
      }

      const parseUsers: UsersType[] = JSON.parse(data.toString());

      const findUser = parseUsers.find((usr) => {
        if (usr.email === req.body.email && usr.pass === req.body.pass) {
          return usr;
        }
      });

      if (!findUser) {
        res.status(400);
        return;
      }

      sessionStorage.setItem("accessToken", findUser.id);
      res.status(200);
      res.redirect("/");
    }
  );
});

app.get("/signup", authMiddleWearForm, (req: Request, res: Response) => {
  readFile(
    path.join(__dirname, "users.json"),
    (err: NodeJS.ErrnoException | null, data: string | Buffer) => {
      const userData: UsersType[] = JSON.parse(data.toString());
      res.render("signup", { data: userData });
    }
  );
});

app.post("/signup", authMiddleWearForm, (req: Request, res: Response) => {
  const user = {
    id: new Date().getTime(),
    firstname: req.body.firstName,
    lastname: req.body.lastName,
    email: req.body.email,
    pass: req.body.pass,
  };

  readFile(
    path.join(__dirname, "users.json"),
    (err: NodeJS.ErrnoException | null, data: string | Buffer) => {
      if (err) {
        // create new file
        writeFile(
          "users.json",
          JSON.stringify([user]),
          function (err: NodeJS.ErrnoException | null) {
            if (err) throw err;
            res.status(200);
            sessionStorage.setItem("accessToken", user.id);
            return;
          }
        );
      } else {
        const parsedUserData: UsersType[] = JSON.parse(data.toString());
        writeFile(
          "users.json",
          JSON.stringify([...parsedUserData, user]),
          (err: NodeJS.ErrnoException | null) => {
            if (err) throw err;
            res.status(200);
            sessionStorage.setItem("accessToken", user.id);
          }
        );
      }
    }
  );

  res.redirect("/");
});

app.post("/logout", authMiddleWear, (req: RequestCustom, res: Response) => {
  if (!req.token) {
    res.status(400);
    return;
  }

  sessionStorage.removeItem("accessToken");
  res.status(200);
  res.redirect("/signin");
});

app.listen(3000, () => console.log("server is on port 3000"));
