-- Create the library_requests table
CREATE TABLE library_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_name TEXT NOT NULL,
  vs_code_version TEXT NOT NULL,
  extension_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  -- Add a constraint to ensure status is one of the expected values
  CONSTRAINT valid_status CHECK (status IN ('pending', 'acknowledged', 'implemented', 'rejected'))
);

-- Create an index on status for faster filtering
CREATE INDEX idx_library_requests_status ON library_requests(status);

-- Create an index on library_name for faster searching
CREATE INDEX idx_library_requests_library_name ON library_requests(library_name);

-- Create an index on requested_at for date range queries
CREATE INDEX idx_library_requests_requested_at ON library_requests(requested_at);

-- Enable Row Level Security (RLS)
ALTER TABLE library_requests ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous users to insert requests (but not read/update/delete)
CREATE POLICY "Allow anonymous inserts" 
  ON library_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create a policy that allows authenticated users with the 'admin' role to do everything
CREATE POLICY "Allow admins full access" 
  ON library_requests
  USING (auth.role() = 'authenticated');

-- Create a view for pending requests (to easily see what needs attention)
CREATE VIEW pending_library_requests AS
  SELECT * FROM library_requests
  WHERE status = 'pending'
  ORDER BY requested_at ASC;

-- Create a function to acknowledge a request
CREATE OR REPLACE FUNCTION acknowledge_library_request(request_id UUID, admin_notes TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE library_requests
  SET status = 'acknowledged',
      acknowledged_at = NOW(),
      notes = admin_notes
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to mark a request as implemented
CREATE OR REPLACE FUNCTION implement_library_request(request_id UUID, admin_notes TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE library_requests
  SET status = 'implemented',
      acknowledged_at = COALESCE(acknowledged_at, NOW()),
      notes = admin_notes
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to reject a request
CREATE OR REPLACE FUNCTION reject_library_request(request_id UUID, reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE library_requests
  SET status = 'rejected',
      acknowledged_at = COALESCE(acknowledged_at, NOW()),
      notes = reason
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;
