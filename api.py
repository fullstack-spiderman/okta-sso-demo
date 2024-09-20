from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from pydantic import BaseModel
from typing import List, Optional
from jose import jwt
import requests

app = FastAPI()

# Okta configuration
OKTA_DOMAIN = "https://{YOUR_OKTA_DOMAIN}"
OKTA_CLIENT_ID = "{YOUR_CLIENT_ID}"
OKTA_AUDIENCE = "{YOUR_AUDIENCE}"

# JWT verification
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=f"{OKTA_DOMAIN}/oauth2/default/v1/authorize",
    tokenUrl=f"{OKTA_DOMAIN}/oauth2/default/v1/token",
)

# Mock database
items = []

class Item(BaseModel):
    id: Optional[int]
    name: str
    description: str

def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        jwks_url = f"{OKTA_DOMAIN}/oauth2/default/v1/keys"
        jwks = requests.get(jwks_url).json()["keys"]
        header = jwt.get_unverified_header(token)
        key = next((k for k in jwks if k["kid"] == header["kid"]), None)
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token")
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=OKTA_AUDIENCE,
            issuer=f"{OKTA_DOMAIN}/oauth2/default",
        )
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(payload: dict = Depends(verify_token)):
    return payload.get("sub")

# CRUD operations
@app.post("/items/", response_model=Item)
async def create_item(item: Item, user: str = Depends(get_current_user)):
    item.id = len(items) + 1
    items.append(item)
    return item

@app.get("/items/", response_model=List[Item])
async def read_items(user: str = Depends(get_current_user)):
    return items

@app.get("/items/{item_id}", response_model=Item)
async def read_item(item_id: int, user: str = Depends(get_current_user)):
    if item_id < 1 or item_id > len(items):
        raise HTTPException(status_code=404, detail="Item not found")
    return items[item_id - 1]

@app.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: int, item: Item, user: str = Depends(get_current_user)):
    if item_id < 1 or item_id > len(items):
        raise HTTPException(status_code=404, detail="Item not found")
    items[item_id - 1] = item
    return item

@app.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: int, user: str = Depends(get_current_user)):
    if item_id < 1 or item_id > len(items):
        raise HTTPException(status_code=404, detail="Item not found")
    items.pop(item_id - 1)
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
