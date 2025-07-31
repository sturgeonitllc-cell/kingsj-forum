exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable configuration');
    }

    // Get questions
    const questionsResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Questions?sort[0][field]=Created&sort[0][direction]=desc`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!questionsResponse.ok) {
      throw new Error('Failed to fetch questions');
    }

    const questionsData = await questionsResponse.json();
    
    // Get answers for each question
    const questions = await Promise.all(
      questionsData.records.map(async (record) => {
        const questionId = record.id;
        
        const answersResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Answers?filterByFormula={Question ID}="${questionId}"&sort[0][field]=Created&sort[0][direction]=asc`,
          {
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        let answers = [];
        if (answersResponse.ok) {
          const answersData = await answersResponse.json();
          answers = answersData.records.map(answerRecord => ({
            id: answerRecord.id,
            content: answerRecord.fields.Content || '',
            author: answerRecord.fields.Author || 'Anonymous',
            created: answerRecord.fields.Created || new Date().toISOString(),
          }));
        }

        return {
          id: questionId,
          title: record.fields.Title || '',
          details: record.fields.Details || '',
          author: record.fields.Author || 'Anonymous',
          created: record.fields.Created || new Date().toISOString(),
          answerCount: answers.length,
          answers: answers,
        };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, questions }),
    };
  } catch (error) {
    console.error('Error fetching questions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
