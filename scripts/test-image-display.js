const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testImageDisplay() {
  try {
    // Get a project
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id, project_name, generated_image_url')
      .limit(1);

    if (fetchError) {
      console.error('Error fetching project:', fetchError);
      return;
    }

    if (!projects || projects.length === 0) {
      console.log('No projects found');
      return;
    }

    const project = projects[0];
    console.log('Project:', project.project_name);
    console.log('Current image URL:', project.generated_image_url || 'None');

    // Set a test image URL (using a placeholder)
    const testImageUrl = 'https://via.placeholder.com/1024x1024.png?text=Test+Mining+Project+Image';

    const { error: updateError } = await supabase
      .from('projects')
      .update({ generated_image_url: testImageUrl })
      .eq('id', project.id);

    if (updateError) {
      console.error('Error updating project:', updateError);
      return;
    }

    console.log('Successfully set test image URL:', testImageUrl);
    console.log('Now check if the image displays in the UI for project:', project.project_name);
  } catch (error) {
    console.error('Error:', error);
  }
}

testImageDisplay();