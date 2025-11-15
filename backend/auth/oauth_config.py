from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from config.settings import settings
import os

# OAuth configuration
config = Config(environ={
    'GOOGLE_CLIENT_ID': os.environ.get('GOOGLE_OAUTH_CLIENT_ID', ''),
    'GOOGLE_CLIENT_SECRET': os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '')
})

oauth = OAuth(config)

oauth.register(
    name='google',
    client_id=config.get('GOOGLE_CLIENT_ID'),
    client_secret=config.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)
