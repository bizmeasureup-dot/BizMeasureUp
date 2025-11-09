# Storage Bucket Setup Instructions

## Quick Setup

The `task-attachments` storage bucket needs to be created in your Supabase project. Follow these steps:

### Step 1: Create the Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Configure the bucket:
   - **Name**: `task-attachments` (must be exactly this name)
   - **Public bucket**: ✅ **Yes** (check this box to allow viewing attachments)
   - **File size limit**: Leave default or set as needed (e.g., 50MB)
   - **Allowed MIME types**: Leave empty to allow all file types
6. Click **"Create bucket"**

### Step 2: Set Up RLS Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies:

1. In Supabase Dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase/storage-setup.sql`
3. Click **"Run"** to execute the policies

This will allow:
- Users to upload attachments for tasks in their organizations
- Users to view/download attachments for tasks they can see
- Admins/owners to delete attachments

### Step 3: Verify Setup

To verify the bucket is set up correctly:

1. Try uploading an attachment when completing a task
2. The upload should succeed without errors
3. The attachment should be accessible via the public URL

## Troubleshooting

### Error: "Bucket not found"
- Make sure the bucket name is exactly `task-attachments` (case-sensitive)
- Verify the bucket was created successfully in Storage dashboard

### Error: "new row violates row-level security policy" (403 Unauthorized)
- **If you already created policies**: Run `supabase/fix-storage-policies.sql` to drop and recreate them with the correct task ID extraction
- **If you haven't created policies yet**: Run `supabase/storage-setup.sql` to create them
- Verify your user has the correct organization membership
- Make sure the task exists and you're assigned to it or are a member of the organization

### Files not accessible
- Ensure the bucket is set to **Public**
- Check that the RLS policies allow SELECT operations

## Alternative: Using Supabase CLI

If you have Supabase CLI installed, you can also create the bucket via command line:

```bash
# Create the bucket
supabase storage create task-attachments --public

# The RLS policies still need to be run via SQL Editor
```

