const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://pwwaxufdxuqfbdkduoll.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3d2F4dWZkeHVxZmJka2R1b2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MDE5MDIsImV4cCI6MjA1NjE3NzkwMn0.9CMgP3QFsJESKlkHxJoU7y6dqUKZBOqpsbtSRvH3pQo'
);

module.exports = supabase