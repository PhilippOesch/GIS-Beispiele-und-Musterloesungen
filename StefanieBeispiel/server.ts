import * as http from "http";
import * as mongo from "mongodb";

const hostname: string = "127.0.0.1"; // localhost
const port: number = 3000;
const mongoUrl: string = "mongodb://localhost:27017"; // für lokale MongoDB
let mongoClient: mongo.MongoClient = new mongo.MongoClient(mongoUrl);

async function dbFind(
    db: string,
    collection: string,
    requestObject: any,
    response: http.ServerResponse
) {
    await mongoClient.connect();
    let result = await mongoClient
        .db(db)
        .collection(collection)
        .find(requestObject)
        .toArray();
    // console.log(result, requestObject); // bei Fehlern zum Testen
    response.setHeader("Content-Type", "application/json");
    response.write(JSON.stringify(result));
}

async function dbAddOrEdit(
    db: string,
    collection: string,
    request: http.IncomingMessage
) {
    let jsonString = "";
    request.on("data", data => {
        jsonString += data;
    });
    request.on("end", async () => {
        await mongoClient.connect();
        // console.log(jsonString); // bei Fehlern zum Testen
        let student = JSON.parse(jsonString);
        if (student._id && student._id !== "") {
            student._id = new mongo.ObjectId(student._id);
            mongoClient.db(db).collection(collection).replaceOne(
                {
                    _id: student._id,
                },
                student
            );
        } else {
            student._id = undefined;
            mongoClient.db(db).collection(collection).insertOne(student);
        }
    });
}

const server: http.Server = http.createServer(
    async (request: http.IncomingMessage, response: http.ServerResponse) => {
        response.statusCode = 200;
        response.setHeader("Access-Control-Allow-Origin", "*"); // bei CORS Fehler
        let url: URL = new URL(request.url || "", `http://${request.headers.host}`);
        switch (url.pathname) {
            case "/student": {
                switch (request.method) {
                    case "GET":
                        await dbFind(
                            "university",
                            "student",
                            {
                                _id: new mongo.ObjectId(url.searchParams.get("_id")), // von String zu Zahl konvertieren
                            },
                            response
                        );
                        break;
                    case "POST":
                        await dbAddOrEdit("university", "student", request);
                        break;
                }
                break;
            }
            case "/faculty": {
                switch (request.method) {
                    case "POST":
                        await dbAddOrEdit("university", "faculty", request);
                        break;
                }
                break;
            }
            case "/students": {
                switch (request.method) {
                    case "GET":
                        await dbFind("university", "student", {}, response);
                        break;
                }
                break;
            }
            case "/faculties": {
                switch (request.method) {
                    case "GET":
                        await dbFind("university", "faculty", {}, response);
                        break;
                }
                break;
            }
            default:
                response.statusCode = 404;
        }
        response.end();
    }
);

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
