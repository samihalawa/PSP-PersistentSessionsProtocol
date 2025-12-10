import asyncio
from playwright.async_api import async_playwright
from psp import PSPClient

# Demo: How a user would use PSP with Playwright Python
async def main():
    # 1. Initialize Client
    client = PSPClient(api_url="http://localhost:3000")
    
    # 2. Get a Session ID (In real usage, you'd list them or have one saved)
    # For demo, let's assume one exists or we just fail gracefully
    print("Connecting to PSP Session...")
    
    # HARDCODED FOR DEMO - You would replace this with a real ID from the CLI output
    # session_id = "dc1d6d1a-de96-4ca0-9098-f62a801714df" 
    # Since we don't have one yet, this script is just a template.
    
    print("Demo: Use the CLI to sync a profile, then copy the ID here.")
    return

    # Real flow:
    # connection = client.connect(session_id)
    # print(f"Connected! WS Endpoint: {connection['browserWSEndpoint']}")
    
    # async with async_playwright() as p:
    #     browser = await p.connect(connection['browserWSEndpoint'])
    #     page = await browser.new_page() # Or context.pages[0] if it reused context
        
    #     await page.goto('https://gmail.com')
    #     print("Title:", await page.title())
        
    #     await browser.close()
    #     client.stop_browser(connection['browserId'])

if __name__ == "__main__":
    asyncio.run(main())
