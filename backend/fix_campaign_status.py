#!/usr/bin/env python3
"""
Fix campaign status for existing campaigns that are incorrectly marked as FAILED
when they should be COMPLETED based on their actual email results.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Campaign, EmailLog, EmailStatus, CampaignStatus
from sqlalchemy import func

def fix_campaign_statuses():
    """Fix campaign statuses based on actual email results"""
    db = SessionLocal()
    
    try:
        print("🔍 Checking campaigns with FAILED status...")
        
        # Get all campaigns marked as FAILED
        failed_campaigns = db.query(Campaign).filter(
            Campaign.status == CampaignStatus.FAILED
        ).all()
        
        print(f"Found {len(failed_campaigns)} campaigns marked as FAILED")
        
        fixed_count = 0
        
        for campaign in failed_campaigns:
            print(f"\n📧 Checking campaign '{campaign.name}' (ID: {campaign.id})")
            
            # Get actual email statistics
            actual_sent = db.query(EmailLog).filter(
                EmailLog.campaign_id == campaign.id,
                EmailLog.status == EmailStatus.SENT
            ).count()
            
            actual_failed = db.query(EmailLog).filter(
                EmailLog.campaign_id == campaign.id,
                EmailLog.status == EmailStatus.FAILED
            ).count()
            
            total_emails = actual_sent + actual_failed
            
            print(f"  📊 Actual stats: {actual_sent} sent, {actual_failed} failed, {total_emails} total")
            
            # Apply the same logic as the fixed code
            if total_emails > 0:
                if actual_failed == 0:
                    # No failures = automatic COMPLETED
                    campaign.status = CampaignStatus.COMPLETED
                    print(f"  ✅ Fixed: No failures detected, marking as COMPLETED")
                    fixed_count += 1
                else:
                    success_rate = actual_sent / total_emails
                    if success_rate >= 0.5:  # 50% success rate threshold
                        campaign.status = CampaignStatus.COMPLETED
                        print(f"  ✅ Fixed: {success_rate:.1%} success rate, marking as COMPLETED")
                        fixed_count += 1
                    else:
                        print(f"  ❌ Keeping FAILED: {success_rate:.1%} success rate is too low")
            else:
                print(f"  ❌ Keeping FAILED: No emails processed")
        
        # Commit all changes
        db.commit()
        
        print(f"\n🎉 Fixed {fixed_count} campaigns")
        print("✅ Campaign statuses updated successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_campaign_statuses()
