package com.example.academiccalculator;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.control.Tab;
import javafx.scene.control.TabPane;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class AcademicCalculatorApp extends Application {
    @Override
    public void start(Stage stage) {
        TabPane tabs = new TabPane();
        tabs.getTabs().add(createTab("GPA", "Grade Point Average", EntryType.COURSE));
        tabs.getTabs().add(createTab("SGPA", "Semester Grade Point Average", EntryType.COURSE));
        tabs.getTabs().add(createTab("CGPA", "Cumulative Grade Point Average", EntryType.SEMESTER));

        Label title = new Label("Academic Calculator");
        title.getStyleClass().add("app-title");
        Label subtitle = new Label("Calculate your grade point averages with credit-weighted results.");
        subtitle.getStyleClass().add("subtitle");

        VBox root = new VBox(16, title, subtitle, tabs);
        root.setPadding(new Insets(28));
        root.getStyleClass().add("app-root");

        Scene scene = new Scene(root, 760, 620);
        scene.getStylesheets().add(getClass().getResource("styles.css").toExternalForm());
        stage.setTitle("Academic Calculator");
        stage.setMinWidth(620);
        stage.setMinHeight(520);
        stage.setScene(scene);
        stage.show();
    }

    private Tab createTab(String title, String heading, EntryType entryType) {
        CalculatorPane calculator = new CalculatorPane(heading, entryType);
        Tab tab = new Tab(title, calculator);
        tab.setClosable(false);
        return tab;
    }

    private enum EntryType {
        COURSE, SEMESTER
    }

    private static final class CalculatorPane extends VBox {
        private final EntryType entryType;
        private final VBox rows = new VBox(10);
        private final Label result = new Label("—");
        private final Label status = new Label("Add your values, then calculate.");
        private final List<EntryRow> entries = new ArrayList<>();

        private CalculatorPane(String heading, EntryType entryType) {
            this.entryType = entryType;
            setSpacing(16);
            setPadding(new Insets(24, 8, 8, 8));
            getStyleClass().add("calculator-pane");

            Label title = new Label(heading);
            title.getStyleClass().add("section-title");
            Label description = new Label(entryType == EntryType.COURSE
                    ? "Enter each course's credits and grade points."
                    : "Enter each semester's SGPA and total credits.");
            description.getStyleClass().add("subtitle");

            HBox columnHeadings = createHeadings();
            ScrollPane scrollPane = new ScrollPane(rows);
            scrollPane.setFitToWidth(true);
            scrollPane.setMinHeight(180);
            scrollPane.setMaxHeight(300);
            scrollPane.getStyleClass().add("rows-scroll");

            Button addButton = new Button(entryType == EntryType.COURSE ? "+ Add course" : "+ Add semester");
            addButton.getStyleClass().add("secondary-button");
            addButton.setOnAction(event -> addEntry());

            Button calculateButton = new Button("Calculate");
            calculateButton.getStyleClass().add("primary-button");
            calculateButton.setOnAction(event -> calculate());

            Button clearButton = new Button("Clear");
            clearButton.getStyleClass().add("secondary-button");
            clearButton.setOnAction(event -> clear());

            HBox actions = new HBox(10, addButton, calculateButton, clearButton);
            actions.setAlignment(Pos.CENTER_LEFT);

            Label resultCaption = new Label("Your result");
            resultCaption.getStyleClass().add("result-caption");
            result.getStyleClass().add("result-value");
            status.getStyleClass().add("status");
            VBox resultCard = new VBox(4, resultCaption, result, status);
            resultCard.getStyleClass().add("result-card");

            getChildren().addAll(title, description, columnHeadings, scrollPane, actions, resultCard);
            addEntry();
        }

        private HBox createHeadings() {
            Label first = new Label(entryType == EntryType.COURSE ? "Course" : "Semester");
            Label credits = new Label("Credits");
            Label points = new Label(entryType == EntryType.COURSE ? "Grade points" : "SGPA");
            first.getStyleClass().add("column-heading");
            credits.getStyleClass().add("column-heading");
            points.getStyleClass().add("column-heading");
            HBox.setHgrow(first, Priority.ALWAYS);
            first.setMaxWidth(Double.MAX_VALUE);
            credits.setPrefWidth(105);
            points.setPrefWidth(125);
            HBox headings = new HBox(10, first, credits, points, new Label(""));
            headings.setAlignment(Pos.CENTER_LEFT);
            return headings;
        }

        private void addEntry() {
            EntryRow entry = new EntryRow(entryType, entries.size() + 1);
            entries.add(entry);
            rows.getChildren().add(entry);
        }

        private void removeEntry(EntryRow entry) {
            if (entries.size() > 1) {
                entries.remove(entry);
                rows.getChildren().remove(entry);
                renumberEntries();
            }
        }

        private void renumberEntries() {
            for (int i = 0; i < entries.size(); i++) {
                entries.get(i).setPlaceholder(i + 1);
            }
        }

        private void calculate() {
            double weightedPoints = 0;
            double totalCredits = 0;
            try {
                for (EntryRow entry : entries) {
                    double credits = parse(entry.credits, "credits");
                    double points = parse(entry.points, entryType == EntryType.COURSE ? "grade points" : "SGPA");
                    if (credits <= 0) {
                        throw new IllegalArgumentException("Credits must be greater than zero.");
                    }
                    if (points < 0) {
                        throw new IllegalArgumentException("Grade points and SGPA cannot be negative.");
                    }
                    weightedPoints += credits * points;
                    totalCredits += credits;
                    if (!Double.isFinite(weightedPoints) || !Double.isFinite(totalCredits)) {
                        throw new IllegalArgumentException("The entered values are too large to calculate.");
                    }
                }
                double average = weightedPoints / totalCredits;
                result.setText(String.format(Locale.getDefault(), "%.2f", average));
                status.setText(String.format(Locale.getDefault(), "Calculated from %.2f total credits.", totalCredits));
                status.getStyleClass().remove("error-status");
            } catch (IllegalArgumentException exception) {
                result.setText("—");
                status.setText(exception.getMessage());
                if (!status.getStyleClass().contains("error-status")) {
                    status.getStyleClass().add("error-status");
                }
            }
        }

        private double parse(TextField field, String fieldName) {
            String value = field.getText().trim();
            if (value.isEmpty()) {
                throw new IllegalArgumentException("Enter " + fieldName + " for every row.");
            }
            try {
                double number = Double.parseDouble(value);
                if (!Double.isFinite(number)) {
                    throw new NumberFormatException();
                }
                return number;
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException("Enter a valid number for " + fieldName + ".");
            }
        }

        private void clear() {
            rows.getChildren().clear();
            entries.clear();
            result.setText("—");
            status.setText("Add your values, then calculate.");
            status.getStyleClass().remove("error-status");
            addEntry();
        }

        private final class EntryRow extends HBox {
            private final TextField name = new TextField();
            private final TextField credits = new TextField();
            private final TextField points = new TextField();

            private EntryRow(EntryType type, int index) {
                setSpacing(10);
                setAlignment(Pos.CENTER_LEFT);
                getStyleClass().add("entry-row");

                name.setPromptText(type == EntryType.COURSE ? "Course " + index : "Semester " + index);
                credits.setPromptText("e.g. 3");
                points.setPromptText(type == EntryType.COURSE ? "e.g. 4.0" : "e.g. 3.7");
                name.setAccessibleText(type == EntryType.COURSE ? "Course name" : "Semester name");
                credits.setAccessibleText("Credits");
                points.setAccessibleText(type == EntryType.COURSE ? "Grade points" : "Semester GPA");

                HBox.setHgrow(name, Priority.ALWAYS);
                name.setMaxWidth(Double.MAX_VALUE);
                credits.setPrefWidth(105);
                points.setPrefWidth(125);

                Button remove = new Button("×");
                remove.getStyleClass().add("remove-button");
                remove.setAccessibleText("Remove row");
                remove.setOnAction(event -> removeEntry(this));
                getChildren().addAll(name, credits, points, remove);
            }

            private void setPlaceholder(int index) {
                name.setPromptText((entryType == EntryType.COURSE ? "Course " : "Semester ") + index);
            }
        }
    }

    public static void main(String[] args) {
        launch(args);
    }
}
