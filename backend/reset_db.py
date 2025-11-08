#!/usr/bin/env python3
"""
Reset database and initialize with sample data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.init_data import init_sample_data
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_database():
    """Reset database and initialize with sample data"""
    try:
        logger.info("🗑️ Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        
        logger.info("🔄 Creating all tables...")
        Base.metadata.create_all(bind=engine)
        
        logger.info("📊 Initializing sample data...")
        init_sample_data()
        
        logger.info("🎉 Database reset and initialized successfully!")
        
    except Exception as e:
        logger.error(f"❌ Error resetting database: {e}")
        raise

if __name__ == "__main__":
    reset_database()
