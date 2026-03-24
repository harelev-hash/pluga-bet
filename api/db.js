const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not found in environment variables');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Save answer to database
async function saveAnswer(answer) {
  try {
    const { data, error } = await supabase
      .from('responses')
      .insert([
        {
          answer: answer,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Error saving answer:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception saving answer:', err);
    return { success: false, error: err.message };
  }
}

// Get statistics
async function getStats() {
  try {
    const { data, error, count } = await supabase
      .from('responses')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error fetching stats:', error);
      return { success: false, error: error.message };
    }

    const yesCount = data.filter((r) => r.answer === 'yes').length;
    const noCount = data.filter((r) => r.answer === 'no').length;

    return {
      success: true,
      stats: {
        total: count,
        yes: yesCount,
        no: noCount,
      },
    };
  } catch (err) {
    console.error('Exception fetching stats:', err);
    return { success: false, error: err.message };
  }
}

// Delete answer from database
async function deleteAnswer(id) {
  try {
    const { data, error } = await supabase
      .from('responses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting answer:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception deleting answer:', err);
    return { success: false, error: err.message };
  }
}

// Update answer in database
async function updateAnswer(id, newAnswer) {
  try {
    const { data, error } = await supabase
      .from('responses')
      .update({ answer: newAnswer })
      .eq('id', id);

    if (error) {
      console.error('Error updating answer:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception updating answer:', err);
    return { success: false, error: err.message };
  }
}

// Get all responses
async function getAllResponses(limit = 50, offset = 0) {
  try {
    const { data, error, count } = await supabase
      .from('responses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data,
      total: count,
      limit,
      offset,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { saveAnswer, getStats, deleteAnswer, updateAnswer, getAllResponses };
