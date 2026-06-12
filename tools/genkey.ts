import { supabase } from '../src/supabase';

const { data, error } = await supabase.from('auth').insert({
  'perm_docx': true,
  'perm_pdf': true,
  'perm_pptx': true,
}).select().single();

if (error) {
  console.log(error);
} else {
  console.log(data);
}
