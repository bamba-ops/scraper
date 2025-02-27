const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://pwwaxufdxuqfbdkduoll.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3d2F4dWZkeHVxZmJka2R1b2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDYwMTkwMiwiZXhwIjoyMDU2MTc3OTAyfQ.a443UIXNWBWRooktCYOfwN3ii8wJ7b9o2Ne5wzCMymI'
);

module.exports = supabase