
import fetch from 'node-fetch';

async function test() {
    const response = await fetch('http://localhost:4000/api/remix-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: 'test-user',
            userPhoto: 'https://example.com/user.jpg',
            prompt: 'Test prompt',
            itemImages: [
                'https://example.com/item1.jpg',
                'https://example.com/item2.jpg',
                'https://example.com/item3.jpg'
            ],
            metadata: {
                referenceImage: 'https://example.com/item1.jpg'
            }
        })
    });

    const text = await response.text();
    console.log('Response:', text);
}

test();
