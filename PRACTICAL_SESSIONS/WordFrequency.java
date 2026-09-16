import java.util.*;
public class WordFrequency {
    public static void main(String[] args) {
        // Sample input text
        String text = "This is a simple text. This text is simple.";
        // Preprocessing: convert to lowercase and remove punctuation
        text = text.toLowerCase().replaceAll("[^a-zA-Z\\s]", "");
        // Tokenization: split into words
        String[] words = text.split("\\s+");
        // Use HashMap to store word counts
        Map<String, Integer> wordCount = new HashMap<>();
        for (String word : words) {
            wordCount.put(word, wordCount.getOrDefault(word, 0) + 1);
        }
        // Print results
        System.out.println("Word Frequencies:");
        for (Map.Entry<String, Integer> entry : wordCount.entrySet()) {
            System.out.println(entry.getKey() + " : " + entry.getValue());
        }
    }
}
