from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create database engine with basic settings
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_timeout=30
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


# Dependency for getting database session with robust handling
def get_db():
    db = SessionLocal()
    try:
        yield db
        # Explicitly commit any pending changes before closing
        db.commit()
    except Exception:
        # Rollback on any exception
        db.rollback()
        raise
    finally:
        # Always close the connection
        db.close()

