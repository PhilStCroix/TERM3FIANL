-- 1. Create Authors table
CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    author_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    country VARCHAR(50)
);

-- 2. Create Genres table
CREATE TABLE genres (
    genre_id SERIAL PRIMARY KEY,
    genre_name VARCHAR(50) NOT NULL
);

-- 3. Create Books table referencing Authors and Genres
CREATE TABLE books (
    book_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author_id INT REFERENCES authors(author_id),
    genre_id INT REFERENCES genres(genre_id),
    publication_year INT,
    ISBN VARCHAR(20) UNIQUE NOT NULL
);

-- 4. Copy mock data into authors
COPY authors 
FROM '/Software Development/FST3/public/authors.csv' 
WITH CSV HEADER;

-- 5. Copy mock data into genres
COPY genres 
FROM '/Software Development/FST3/public/genres.csv' 
WITH CSV HEADER;

-- 6. Copy mock data into books
COPY books 
FROM '/Software Development/FST3/public/books.csv' 
WITH CSV HEADER;

-- 7. show understanding of SELECT
Select * FROM authors;

SELECT * FROM authors where country = 'Russia';

SELECT * FROM genres;

SELECT * FROM books;

SELECT * FROM books WHERE publication_year > 2010;

SELECT * FROM books WHERE author_id = 1;

CREATE TABLE users (
	username VARCHAR(100),
	password VARCHAR(50)
);

INSERT INTO users (username, password)
	VALUES ('phil', 'phil');
	
INSERT INTO users (username, password)
	VALUES ('sam', 'sam');
	
INSERT INTO users (username, password)
	VALUES ('frank', 'frank');
	
select * from users;
