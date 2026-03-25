import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # 1. Update legacy fields to real DB fields
    content = content.replace("calculated_checkin", "suggested_checkin_date")
    content = content.replace("calculated_checkout", "suggested_checkout_date")
    
    # In forms and displays, actual_checkin was representing user-typed dates: these map to DB's checkin_date
    content = content.replace("actual_checkin", "checkin_date")
    content = content.replace("actual_checkout", "checkout_date")
    
    content = content.replace("confirmation_number", "reservation_number")
    
    # divergence_reason is string in the old type, array in the real DB. 
    # Let's fix property names: approved_by -> divergence_approved_by
    content = content.replace("approved_by", "divergence_approved_by")
    content = content.replace("approved_at", "divergence_approved_at")
    
    # room_type and hotel_name do not exist
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            process_file(filepath)
