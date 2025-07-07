from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="psp-sdk",
    version="0.1.0",
    author="PSP Contributors",
    author_email="contact@psp-protocol.org",
    description="Python SDK for Persistent Sessions Protocol (PSP)",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/psp-protocol/PSP-PersistentSessionsProtocol",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: Browsers",
        "Topic :: Software Development :: Testing",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.25.0",
        "websockets>=10.0",
        "playwright>=1.40.0",
        "aiohttp>=3.8.0",
        "pydantic>=1.8.0",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0",
            "pytest-asyncio>=0.18.0",
            "black>=22.0",
            "flake8>=4.0",
            "mypy>=0.991",
        ],
        "selenium": ["selenium>=4.0.0"],
        "playwright": ["playwright>=1.40.0"],
    },
    entry_points={
        "console_scripts": [
            "psp=psp_sdk.cli:main",
        ],
    },
)