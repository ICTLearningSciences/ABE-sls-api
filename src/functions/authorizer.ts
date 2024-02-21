import jwt from "jsonwebtoken";
import requireEnv from "../helpers.js";

const JWT_SECRET = requireEnv("JWT_SECRET")

function extract_token_from_header(request: any){
    if(request["type"] != "TOKEN" || !("authorizationToken" in request)){
        throw new Error("no authentication token provided")
    }
    const bearerToken: string = request["authorizationToken"];
    const tokenAuthentication = bearerToken.toLowerCase().startsWith("bearer ");
    const tokenSplit = bearerToken.split(" ")
    if (!tokenAuthentication || tokenSplit.length == 1){
        throw new Error("no authentication token provided")
    }
    const token = tokenSplit[1]
    try{
        const payload = jwt.verify(token, JWT_SECRET, {algorithms: ["HS256"]})
        return payload
    }catch(err){
        throw new Error("invalid authentication token")
    }
}

export const handler = async (event:any) => {
    try{
        const payload = extract_token_from_header(event)
        return {
            "principalId": "apigateway.amazonaws.com",
            "policyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": "execute-api:Invoke",
                        "Effect": "Allow",
                        // Resource: methodArn,  # this resulted in random aws request denied:
                        // https://forums.aws.amazon.com/thread.jspa?messageID=937251&#937251
                        "Resource": "*"
                    }
                ]
            },
            "context": {
                "token": JSON.stringify(payload)
            }
        }
    }catch(err){
        return {
            "principalId": "*",
            "policyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": "*",
                        "Effect": "Deny",
                        "Resource": "*",
                    },
                ],
            },
        }
    }
}